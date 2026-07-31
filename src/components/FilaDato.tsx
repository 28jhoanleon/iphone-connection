export default function FilaDato({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-[14.5px] last:border-0">
      <span className="text-mute">{k}</span>
      <b className="text-right font-data text-[12.5px] font-medium">{v}</b>
    </div>
  );
}
