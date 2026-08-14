def _register(client, name, email, password="secret123"):
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201
    data = response.json()
    return data["user"], data["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_group(client, token, name="Trip", description="Goa trip"):
    response = client.post(
        "/api/groups",
        headers=_auth(token),
        json={"name": name, "description": description},
    )
    assert response.status_code == 201
    return response.json()


def _add_member(client, token, group_id, user_id):
    return client.post(
        f"/api/groups/{group_id}/members",
        headers=_auth(token),
        json={"user_id": user_id},
    )


def test_group_apis_require_auth(client):
    assert client.get("/api/groups").status_code == 401
    assert client.post("/api/groups", json={"name": "X"}).status_code == 401
    assert client.get("/api/groups/1").status_code == 401
    assert client.post("/api/groups/1/members", json={"user_id": 1}).status_code == 401
    assert client.get("/api/groups/1/members").status_code == 401
    assert client.delete("/api/groups/1/members/2").status_code == 401
    assert client.delete("/api/groups/1/leave").status_code == 401


def test_create_group_adds_creator_as_admin_member(client):
    alice, token = _register(client, "Alice", "alice@example.com")
    group = _create_group(client, token)

    assert group["name"] == "Trip"
    assert group["description"] == "Goa trip"
    assert group["created_by"] == alice["id"]

    members = client.get(
        f"/api/groups/{group['id']}/members", headers=_auth(token)
    ).json()
    assert len(members) == 1
    assert members[0]["user_id"] == alice["id"]
    assert members[0]["role"] == "admin"
    assert "joined_at" in members[0]
    assert members[0]["user"]["email"] == "alice@example.com"


def test_list_groups_returns_only_own_groups(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")

    group_a = _create_group(client, alice_token, "Trip A")
    _create_group(client, bob_token, "Trip B")

    alice_groups = client.get("/api/groups", headers=_auth(alice_token)).json()
    assert [g["id"] for g in alice_groups] == [group_a["id"]]

    _add_member(client, alice_token, group_a["id"], bob["id"])
    bob_groups = client.get("/api/groups", headers=_auth(bob_token)).json()
    assert sorted(g["id"] for g in bob_groups) == sorted(
        [group_a["id"], group_a["id"] + 1]
    )


def test_non_member_cannot_view_or_modify_group(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    carol, carol_token = _register(client, "Carol", "carol@example.com")

    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    for token in (carol_token,):
        assert client.get(
            f"/api/groups/{group['id']}", headers=_auth(token)
        ).status_code == 403
        assert client.get(
            f"/api/groups/{group['id']}/members", headers=_auth(token)
        ).status_code == 403
        assert client.post(
            f"/api/groups/{group['id']}/members",
            headers=_auth(token),
            json={"user_id": carol["id"]},
        ).status_code == 403

    # creator can add, member can add
    assert _add_member(client, bob_token, group["id"], carol["id"]).status_code == 201


def test_add_member_by_email(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)

    response = client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(alice_token),
        json={"email": "bob@example.com"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "bob@example.com"


def test_add_member_invalid_operations(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    group = _create_group(client, alice_token)

    missing_user = _add_member(client, alice_token, group["id"], 9999)
    assert missing_user.status_code == 404

    missing_email = client.post(
        f"/api/groups/{group['id']}/members",
        headers=_auth(alice_token),
        json={"email": "nobody@example.com"},
    )
    assert missing_email.status_code == 404

    no_target = client.post(
        f"/api/groups/{group['id']}/members", headers=_auth(alice_token), json={}
    )
    assert no_target.status_code == 422

    duplicate = _add_member(client, alice_token, group["id"], alice["id"])
    assert duplicate.status_code == 409


def test_remove_member(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, _ = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    response = client.delete(
        f"/api/groups/{group['id']}/members/{bob['id']}",
        headers=_auth(alice_token),
    )
    assert response.status_code == 204

    members = client.get(
        f"/api/groups/{group['id']}/members", headers=_auth(alice_token)
    ).json()
    assert [m["user_id"] for m in members] == [alice["id"]]


def test_remove_member_invalid_operations(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)

    remove_creator = client.delete(
        f"/api/groups/{group['id']}/members/{alice['id']}",
        headers=_auth(alice_token),
    )
    assert remove_creator.status_code == 400

    remove_self = client.delete(
        f"/api/groups/{group['id']}/members/{alice['id']}",
        headers=_auth(alice_token),
    )
    assert remove_self.status_code == 400

    remove_non_member = client.delete(
        f"/api/groups/{group['id']}/members/{bob['id']}",
        headers=_auth(alice_token),
    )
    assert remove_non_member.status_code == 404

    # non-member actor cannot remove
    _, carol_token = _register(client, "Carol", "carol@example.com")
    _add_member(client, alice_token, group["id"], bob["id"])
    forbidden = client.delete(
        f"/api/groups/{group['id']}/members/{bob['id']}",
        headers=_auth(carol_token),
    )
    assert forbidden.status_code == 403


def test_leave_group(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    leave = client.delete(f"/api/groups/{group['id']}/leave", headers=_auth(bob_token))
    assert leave.status_code == 204

    members = client.get(
        f"/api/groups/{group['id']}/members", headers=_auth(alice_token)
    ).json()
    assert [m["user_id"] for m in members] == [alice["id"]]

    # leaver now forbidden from viewing
    assert client.get(
        f"/api/groups/{group['id']}", headers=_auth(bob_token)
    ).status_code == 403


def test_leave_group_when_not_member(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, bob_token = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)

    leave = client.delete(f"/api/groups/{group['id']}/leave", headers=_auth(bob_token))
    assert leave.status_code == 404


def test_get_group_includes_members_and_creator(client):
    alice, alice_token = _register(client, "Alice", "alice@example.com")
    bob, _ = _register(client, "Bob", "bob@example.com")
    group = _create_group(client, alice_token)
    _add_member(client, alice_token, group["id"], bob["id"])

    detail = client.get(
        f"/api/groups/{group['id']}", headers=_auth(alice_token)
    ).json()
    assert detail["creator"]["name"] == "Alice"
    assert detail["creator"]["id"] == alice["id"]
    assert len(detail["members"]) == 2
    assert {m["user"]["email"] for m in detail["members"]} == {
        "alice@example.com",
        "bob@example.com",
    }
