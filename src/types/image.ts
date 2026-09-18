export type ImageFormat = 'Iso9660' | 'HybridIso' | 'RawDiskImage' | 'Unknown';

export type BootType = 'UefiOnly' | 'BiosOnly' | 'UefiAndBiosHybrid' | 'NonBootable' | 'Unknown';

export type CompatibilityLevel = 'Supported' | 'PartiallySupported' | 'Unsupported' | 'Unknown';

export type DetectedOs =
  | { Windows: string }
  | { Ubuntu: string }
  | { Debian: string }
  | { Fedora: string }
  | { ArchLinux: string }
  | { ChromeOsFlex: string }
  | { GenericLinux: string }
  | 'Unknown';

export interface ImageMetadata {
  path: string;
  filename: string;
  size_bytes: number;
  format: ImageFormat;
  boot_type: BootType;
  compatibility: CompatibilityLevel;
  detected_os: DetectedOs;
  volume_label?: string | null;
  has_el_torito: boolean;
  has_mbr: boolean;
  has_gpt: boolean;
  sha256?: string | null;
}
