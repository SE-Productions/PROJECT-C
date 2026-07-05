import { useState, useEffect } from "react";
import {
  Settings,
  Key,
  Globe,
  Bot,
  Image,
  Share2,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [appSecret, setAppSecret] = useState("");
  const [authStatus, setAuthStatus] = useState<"unconfigured" | "configured">("unconfigured");

  useEffect(() => {
    const stored = localStorage.getItem("aura_api_key");
    if (stored) {
      setAppSecret(stored);
      setAuthStatus("configured");
    }
  }, []);

  const saveSecret = () => {
    if (appSecret.trim()) {
      localStorage.setItem("aura_api_key", appSecret.trim());
      setAuthStatus("configured");
    }
  };

  const clearSecret = () => {
    localStorage.removeItem("aura_api_key");
    setAppSecret("");
    setAuthStatus("unconfigured");
  };

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
    {
      name: "A2E Media",
      key: "A2E_API_KEY",
      icon: <Image className="h-5 w-5" />,
      color: "text-pink-500",
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

      {/* App Authentication */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-rose-500" />
          <h3 className="font-semibold text-white">App Authentication</h3>
        </div>
        <p className="text-sm text-neutral-400 mb-4">
          Set your APP_SECRET to authenticate API requests in production.
          Must match the APP_SECRET environment variable on the server.
        </p>
        <div className="flex gap-3">
          <Input
            type="password"
            placeholder="Enter APP_SECRET..."
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            className="flex-1 bg-neutral-800 border-neutral-700 text-white"
          />
          <Button
            onClick={saveSecret}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Save
          </Button>
          {authStatus === "configured" && (
            <Button
              onClick={clearSecret}
              variant="outline"
              className="border-neutral-700 text-neutral-400 hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>
        {authStatus === "configured" && (
          <div className="flex items-center gap-2 mt-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-400">
              Authentication configured. API requests will include x-api-key header.
            </span>
          </div>
        )}
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
