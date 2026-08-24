import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      toast.error(`Authentication error: ${error}`);
      navigate("/login");
      return;
    }

    if (code) {
      loginWithGoogle({ code, redirect_uri: window.location.origin + "/auth/callback" })
        .then(() => {
          navigate("/dashboard");
        })
        .catch((err) => {
          toast.error(err.message || "Failed to authenticate with Google");
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
  }, [location, loginWithGoogle, navigate, toast]);

  return (
    <div className="flex flex-column items-center justify-center" style={{ minHeight: "100vh" }}>
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-secondary">Completing authentication...</p>
    </div>
  );
}
