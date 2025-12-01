import "./PayloadsView.css";
import HeaderBuilderCard from "../components/HeaderBuilderCard";
import HeaderInspectorCard from "../components/HeaderInspectorCard";
import BudsRegistryCard from "../components/BudsRegistryCard";
import TagEnginePanel from "../components/TagEnginePanel";

export default function PayloadsView() {
  return (
    <div className="payloads-root">
      <h2>Payloads / BUDS Workbench</h2>
      <p className="payloads-intro">
        segOP Lab integrates BUDS in three layers: a header builder for
        segOP payloads, a header inspector that explains the TLV, a lab
        registry browser for tiers &amp; types, and a full Tag Engine for
        classifying transactions into ARBDA tiers and policy scores.
      </p>

      <HeaderBuilderCard />
      <HeaderInspectorCard />
      <BudsRegistryCard />
      <TagEnginePanel />
    </div>
  );
}
