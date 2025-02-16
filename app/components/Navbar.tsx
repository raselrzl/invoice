import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logotext.png";
import { RainbowButton } from "@/components/magicui/rainbow-button";

export function Navbar() {
  return (
    <div className="flex items-center justify-between py-5">
      <Link href="/" className="flex items-center gap-2">
        {/* <Image src={Logo} alt="Logo"  height={20} width={200} /> */}
        <h3 className="text-3xl font-semibold">
          Invoice<span className="text-blue-500"></span>
        </h3>
      </Link>
      <Link href="/login">
        <RainbowButton>Get Started</RainbowButton>
      </Link>
    </div>
  );
}
