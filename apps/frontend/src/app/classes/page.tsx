import { redirect } from 'next/navigation';

export default function RootClassesPage() {
  // Redirect to teacher classes by default, or we could handle role-based redirect here
  // But since the user wants /t/classes to be the main path for teachers:
  redirect('/t/classes');
}
