import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Key,
  Globe,
  Bot,
  Image,
  Share2,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ApiKeyStatus {
  name: string;
  key: string;
  icon: React.ReactNode;
  color: string;
  configured: boolean;
}

export default function SettingsPage() {
  const [testing, setTesting] = useState<string | null>(null);

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

  const platforms = [
    { name: "Instagram", connected: false, setupUrl: "https://app.composio.dev/app/instagram" },
    { name: "TikTok", connected: false, setupUrl: "https://app.composio.dev/app/tiktok" },
    { name: "Facebook", connected: false, setupUrl: "https://app.composio.dev/app/facebook" },
    { name: "X (Twitter)", connected: false, setupUrl: "https://app.composio.dev/app/twitter" },
    { name: "YouTube", connected: false, setupUrl: "https://app.composio.dev/app/youtube" },
    { name: "Reddit", connected: false, setupUrl: "https://app.composio.dev/app/reddit" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Manage API keys and platform connections
        </p>
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

      {/* Social Platforms */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-white">Social Media Platforms</h3>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Connect your accounts via Composio to enable direct publishing
        </p>
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-800"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{platform.name}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs"
                onClick={() => window.open(platform.setupUrl, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Connect
              </Button>
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
