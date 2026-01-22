import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to manager login by default
  redirect('/manager');
}
