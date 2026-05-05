import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/common/EmptyState";

export default function Team() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <EmptyState
        icon={Users}
        title="Team management is coming next"
        description="Workspace member invites, roles, and access controls will appear here once the team management API is connected."
        actionLabel="Back to Dashboard"
        onAction={() => navigate("/dashboard")}
      />
    </AppShell>
  );
}
