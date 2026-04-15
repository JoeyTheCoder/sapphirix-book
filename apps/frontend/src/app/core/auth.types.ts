export type AdminProfile = {
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  salon: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
};