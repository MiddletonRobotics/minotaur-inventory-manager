import Link from 'next/link';
import { Settings } from 'lucide-react';

import { authenticate } from '@/lib/session';
import { logout } from '@/server/auth';

export default async function Navbar() {
    const session = await authenticate();
}