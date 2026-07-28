// DEV-ONLY: renders the dashboard's content sections against an empty
// workspace so the first-run experience can be checked without a fresh account.
import StarterGallery from "@/components/dashboard/StarterGallery";
import LayerStrip from "@/components/dashboard/LayerStrip";

export default function DevEmpty() {
  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">
      <section>
        <h2 className="font-display text-xl font-semibold">Start with a landmark product</h2>
        <p className="text-[13px] text-muted mt-1 mb-5">
          Every card runs a full eight-layer analysis — the same pipeline as pasting a URL.
        </p>
        <StarterGallery onPick={() => {}} busy={false} pending="" />
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">What Prism reveals</h2>
        <p className="text-[13px] text-muted mt-1 mb-5">
          Eight research passes run in parallel, then an innovation synthesis reads all of them.
        </p>
        <LayerStrip />
      </section>
    </div>
  );
}
