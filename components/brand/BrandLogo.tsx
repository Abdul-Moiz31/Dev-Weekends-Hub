import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

export default function BrandLogo({
  size = 68,
  className,
  alt = 'Dev Weekends',
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      <Image
        src="/logo1.png"
        alt={alt}
        fill
        priority={priority}
        sizes={`${size}px`}
        className="object-contain dark:hidden"
      />
      <Image
        src="/logo2.png"
        alt={alt}
        fill
        priority={priority}
        sizes={`${size}px`}
        className="hidden object-contain dark:block"
      />
    </div>
  );
}
