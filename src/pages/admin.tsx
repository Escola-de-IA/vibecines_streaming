import AdminPanel from "@/components/AdminPanel";

const Admin = () => {
  return <AdminPanel onClose={function (): void {
      throw new Error("Function not implemented.");
  } } />;
};

export default Admin;
