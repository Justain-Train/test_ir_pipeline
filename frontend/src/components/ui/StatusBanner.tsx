type StatusBannerProps = {
  status: string;
};

export function StatusBanner({ status }: StatusBannerProps) {
  return <div className="mt-3 text-base font-semibold">{status}</div>;
}
