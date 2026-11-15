import { requireAdmin } from "@/lib/auth"; import AdminClient from "./AdminClient";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await requireAdmin("/admin");return <div className="admin-body"><AdminClient email={user.email} signOutPath="/admin/logout"/></div>}
