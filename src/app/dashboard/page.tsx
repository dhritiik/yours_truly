// Auth is guaranteed by the dashboard layout (AuthProvider + redirect guard).
// Wedding data is provided by WeddingProvider at layout level.
// No auth subscription or Firestore reads needed here.
import InvitationEditor from "@/components/dashboard/InvitationEditor";

export default function DashboardPage() {
  return <InvitationEditor />;
}
