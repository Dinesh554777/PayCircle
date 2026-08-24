import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../common/Toast";
import { apiRequest } from "../../api/client";

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(null);
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const toast = useToast();

  useEffect(() => {
    // Fetch client ID from backend configuration
    apiRequest("/auth/google/config")
      .then((res) => {
        if (res.client_id) {
          setClientId(res.client_id);
        }
      })
      .catch((err) => console.error("Failed to load Google config", err));
  }, []);

  useEffect(() => {
    // Initialize Google Identity Services (GSI) once client_id is available
    if (clientId && window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
    }
  }, [clientId]);

  async function handleCredentialResponse(response) {
    if (!response.credential) return;
    setLoading(true);
    try {
      await loginWithGoogle({ credential: response.credential });
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to authenticate with Google");
      setLoading(false);
    }
  }

  async function handleRedirectFlow() {
    if (!clientId) {
      toast.error("Google OAuth is not configured on the server.");
      return;
    }
    try {
      setLoading(true);
      const res = await apiRequest("/auth/google/url");
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      toast.error("Failed to initiate Google login");
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (clientId && window.google) {
      // Prompt OneTap or native prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to redirect flow if prompt is not displayed
          handleRedirectFlow();
        }
      });
    } else {
      // Fallback if GSI script is not loaded
      handleRedirectFlow();
    }
  }

  return (
    <>
      {!window.google && (
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      )}
      <button
        type="button"
        className="btn-google"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          <svg className="google-icon" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
        )}
        Continue with Google
      </button>
    </>
  );
}
