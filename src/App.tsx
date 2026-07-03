import { Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Campaigns from "./pages/Campaigns";
import AgentHub from "./pages/AgentHub";
import MediaGallery from "./pages/MediaGallery";
import PostScheduler from "./pages/PostScheduler";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/books" element={<Books />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/agents" element={<AgentHub />} />
        <Route path="/media" element={<MediaGallery />} />
        <Route path="/posts" element={<PostScheduler />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
