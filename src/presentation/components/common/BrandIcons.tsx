import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

type BrandIconProps = {
  size?: number;
  color?: string;
};

export function PayoneerIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="payTop" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FF4500" />
          <Stop offset="0.5" stopColor="#FFD600" />
          <Stop offset="1" stopColor="#00E676" />
        </LinearGradient>
        <LinearGradient id="payBot" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#2979FF" />
          <Stop offset="0.5" stopColor="#E040FB" />
          <Stop offset="1" stopColor="#FF4500" />
        </LinearGradient>
      </Defs>
      <Path
        d="M32 5 A27 27 0 0 1 32 59"
        fill="none"
        stroke="url(#payTop)"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
      <Path
        d="M32 59 A27 27 0 0 1 32 5"
        fill="none"
        stroke="url(#payBot)"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GreyIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Rect width={256} height={256} rx={20} fill="#1A1A1A" />
      <Path
        d="M127.997 127.035V101.803H114.626C114.947 101.577 115.278 101.351 115.609 101.141C120.234 98.159 125.615 96.5884 131.167 96.5884C146.937 96.5884 159.77 109.307 159.77 124.936V126.732H186.69V124.936C186.69 117.514 185.219 110.308 182.319 103.512C179.522 96.9579 175.519 91.076 170.423 86.0255C165.327 80.975 159.392 77.0075 152.778 74.241C145.932 71.3617 138.656 69.904 131.167 69.904C120.395 69.904 109.939 72.9682 100.938 78.768C98.2861 80.4772 95.7847 82.407 93.4646 84.537V69.6936H68V101.167L100.725 127.04H127.997V127.035Z"
        fill="#FFFFFF"
      />
      <Path
        d="M127.997 129.093V154.33H141.204C136.392 157.738 130.644 159.576 124.616 159.576C108.846 159.576 96.0126 146.857 96.0126 131.228V129.432H69.0928V131.228C69.0928 138.65 70.5636 145.856 73.4638 152.652C76.2604 159.206 80.2637 165.088 85.3545 170.139C90.4505 175.189 96.3855 179.152 102.999 181.928C109.851 184.803 117.127 186.26 124.616 186.26C138.723 186.26 152.307 180.902 162.535 171.427V186.306H188V154.967L155.275 129.098H128.003L127.997 129.093Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

export function DukascopyIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={8} fill="#DA291C" />
      <Rect x={26} y={12} width={12} height={40} rx={1} fill="#FFFFFF" />
      <Rect x={12} y={26} width={40} height={12} rx={1} fill="#FFFFFF" />
    </Svg>
  );
}

export function EarthIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} fill="none" stroke="#4FC3F7" strokeWidth={2.5} />
      <Path
        d="M24 2C24 2 14 12 14 24s10 22 10 22M24 2c0 0 10 10 10 22S24 46 24 46"
        fill="none"
        stroke="#4FC3F7"
        strokeWidth={2}
      />
      <Path d="M4 18h40M4 30h40" fill="none" stroke="#4FC3F7" strokeWidth={2} />
    </Svg>
  );
}

export function MobileIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={12} y={4} width={24} height={40} rx={4} fill="none" stroke="#90A4AE" strokeWidth={2.5} />
      <Rect x={14} y={10} width={20} height={24} rx={1} fill="#90A4AE" opacity={0.2} />
      <Circle cx={24} cy={39} r={2} fill="#90A4AE" />
    </Svg>
  );
}

export function ShieldIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z"
        fill="none"
        stroke="#66BB6A"
        strokeWidth={2.5}
      />
      <Path d="M18 24l4 4 8-8" fill="none" stroke="#66BB6A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ContactlessIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={4} y={8} width={40} height={32} rx={4} fill="none" stroke="#7E57C2" strokeWidth={2.5} />
      <Path d="M20 20a6 6 0 010 8" fill="none" stroke="#7E57C2" strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 17a10 10 0 010 14" fill="none" stroke="#7E57C2" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 14a14 14 0 010 20" fill="none" stroke="#7E57C2" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BitcoinIcon({size = 24}: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} fill="#F7931A" />
      <SvgText
        x={24}
        y={32}
        textAnchor="middle"
        fontSize={28}
        fontWeight="bold"
        fill="#FFFFFF">
        {'\u20BF'}
      </SvgText>
    </Svg>
  );
}

export const BRAND_ICONS: Record<string, React.FC<BrandIconProps>> = {
  payoneer: PayoneerIcon,
  grey: GreyIcon,
  dukascopy: DukascopyIcon,
  'brand-earth': EarthIcon,
  'brand-mobile': MobileIcon,
  'brand-shield': ShieldIcon,
  'brand-contactless': ContactlessIcon,
  'brand-bitcoin': BitcoinIcon,
};

export function isBrandIcon(key: string): boolean {
  return key in BRAND_ICONS;
}

export function BrandIcon({name, size = 24, color}: BrandIconProps & {name: string}) {
  const Component = BRAND_ICONS[name];
  if (!Component) {
    return null;
  }
  return <Component size={size} color={color} />;
}
