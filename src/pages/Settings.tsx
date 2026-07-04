import {
  Settings,
  Key,
  Globe,
  Bot,
  Image,
  Share2,
  CheckCircle2,
} from "lucide-react";
import ComposioDropdown from "@/components/ComposioDropdown";
import PageHero from "@/components/PageHero";

interface ApiKeyStatus {
  name: string;
  key: string;
  icon: React.ReactNode;
  color: string;
  configured: boolean;
}

export default function SettingsPage() {
  const apiKeys: ApiKeyStatus[] = [
    {
      name: "Composio",
      key: "COMPOSIO_API_KEY",
      icon: <Share2 className="h-5 w-5" />,
      color: "text-amber-500",
      configured: true,
    },
    {
      name: "Gemini AI",
      key: "GEMINI_API_KEY",
      icon: <Bot className="h-5 w-5" />,
      color: "text-sky-500",
      configured: true,
    },
    {
      name: "NVIDIA",
      key: "NVIDIA_API_KEY",
      icon: <Image className="h-5 w-5" />,
      color: "text-violet-500",
      configured: true,
    },
    {
      name: "Firecrawl",
      key: "FIRECRAWL_API_KEY",
      icon: <Globe className="h-5 w-5" />,
      color: "text-emerald-500",
      configured: true,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHero
        image="/images/hero-settings.jpg"
        title="Settings"
        subtitle="Manage API keys and platform connections"
        height="sm"
      />

      {/* Composio Integration Dropdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <ComposioDropdown />
      </div>

      {/* API Keys */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-white">API Keys</h3>
        </div>
        <div className="space-y-3">
          {apiKeys.map((api) => (
            <div
              key={api.name}
              className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-800"
            >
              <div className={`p-2 rounded-lg ${api.color} bg-neutral-800`}>
                {api.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{api.name}</div>
                <div className="text-xs text-neutral-400">{api.key}</div>
              </div>
              <div className="flex items-center gap-2">
                {api.configured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-400">Configured</span>
                  </>
                ) : (
                  <span className="text-xs text-red-400">Not set</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-neutral-500" />
          <h3 className="font-semibold text-white">About AURA Publishing</h3>
        </div>
        <p className="text-sm text-neutral-400">
          AI-powered publishing management system. Version 1.0.0 MVP.
        </p>
        <div className="mt-3 text-xs text-neutral-500 space-y-1">
          <p>Planner Agent: Orchestrates marketing campaigns</p>
          <p>Research Agent: Web search and trend analysis</p>
          <p>Media Agent: Image and video generation</p>
          <p>Social Agent: Social media content creation and publishing</p>
        </div>
      </div>
    </div>
  );
}
