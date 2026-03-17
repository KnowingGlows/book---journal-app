"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HiOutlineBookOpen, HiOutlinePencilSquare, HiOutlineHome, HiOutlineArrowRightOnRectangle, HiOutlineCheckCircle, HiOutlineChartBar } from "react-icons/hi2";

const navItems = [
  { href: "/", label: "Habits", icon: HiOutlineCheckCircle },
  { href: "/dashboard", label: "Books Dashboard", icon: HiOutlineChartBar },
  { href: "/books", label: "Books", icon: HiOutlineBookOpen },
  { href: "/journal", label: "Journal", icon: HiOutlinePencilSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-zinc-800 bg-[#0a0a0c] px-4 py-8">
      <div className="mb-10 px-3">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Shelf<span className="text-violet-400">d</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-500">your personal space</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#2e1065] text-violet-400"
                  : "text-zinc-400 hover:bg-[#1a1a1e] hover:text-zinc-200"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 pt-4">
        <p className="mb-2 truncate px-3 text-xs text-zinc-500">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-[#1a1a1e] hover:text-red-400"
        >
          <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
