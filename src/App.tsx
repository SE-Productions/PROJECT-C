import { Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Campaigns from "./pages/Campaigns";
import AgentHub from "./pages/AgentHub";
import MediaGallery from "./pages/MediaGallery";
import PostScheduler from "./pages/PostScheduler";
import Learn from "./pages/Learn";
import Settings from "./pages/Settings";
import SmartChat from "./pages/SmartChat";
import ScratchPad from "./pages/ScratchPad";
import Skills from "./pages/Skills";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<SmartChat />} />
        <Route path="/books" element={<Books />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/agents" element={<AgentHub />} />
        <Route path="/media" element={<MediaGallery />} />
        <Route path="/posts" element={<PostScheduler />} />
        <Route path="/scratch-pad" element={<ScratchPad />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
