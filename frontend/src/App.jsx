import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import GroupExpenses from "./pages/GroupExpenses";
import ExpenseForm from "./pages/ExpenseForm";
import ExpenseDetails from "./pages/ExpenseDetails";
import GroupBalances from "./pages/GroupBalances";
import GroupTransactions from "./pages/GroupTransactions";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/groups/:id/expenses" element={<GroupExpenses />} />
        <Route path="/groups/:id/expenses/new" element={<ExpenseForm />} />
        <Route path="/groups/:id/expenses/:expenseId" element={<ExpenseDetails />} />
        <Route path="/groups/:id/expenses/:expenseId/edit" element={<ExpenseForm />} />
        <Route path="/groups/:id/balances" element={<GroupBalances />} />
        <Route path="/groups/:id/transactions" element={<GroupTransactions />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
