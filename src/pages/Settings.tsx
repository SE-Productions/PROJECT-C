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
  XCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ComposioDropdown from "@/components/ComposioDropdown";
import PageHero from "@/components/PageHero";

const ICON_MAP: Record<string, React.ReactNode> = {
  "A2E Media": <Image className="h-5 w-5" />,
  "Gemini AI": <Bot className="h-5 w-5" />,
  NVIDIA: <Image className="h-5 w-5" />,
  Firecrawl: <Globe className="h-5 w-5" />,
  Composio: <Share2 className="h-5 w-5" />,
  Steel: <Globe className="h-5 w-5" />,
};

const COLOR_MAP: Record<string, string> = {
  "A2E Media": "text-pink-500",
  "Gemini AI": "text-sky-500",
  NVIDIA: "text-violet-500",
  Firecrawl: "text-emerald-500",
  Composio: "text-amber-500",
  Steel: "text-cyan-500",
};

interface KeyHealth {
  name: string;
  envKey: string;
  healthy: boolean;
  detail?: string;
}

export default function SettingsPage() {
  const [appSecret, setAppSecret] = useState("");
  const [authStatus, setAuthStatus] = useState<"unconfigured" | "configured">("unconfigured");
  const [keyHealth, setKeyHealth] = useState<KeyHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const resp = await fetch("/api/health/keys");
        if (!resp.ok) throw new Error("Health check failed");
        const data = await resp.json();
        if (!cancelled) setKeyHealth(data);
      } catch {
        if (!cancelled) setKeyHealth([]);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }
    check();
    const iv = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

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

  const connectedCount = keyHealth?.filter((k) => k.healthy).length ?? 0;
  const totalCount = keyHealth?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHero
        image="/images/hero-settings.jpg"
        title="Settings"
        subtitle="Manage API keys and platform connections"
        height="sm"
      />

      {/* System Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-white">All Systems Active</h3>
          </div>
          <span className="text-xs text-neutral-400">
            {connectedCount} of {totalCount} APIs connected
          </span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: totalCount > 0 ? `${(connectedCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Composio Integration */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <ComposioDropdown />
      </div>

      {/* API Keys — Live Health Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-white">API Keys</h3>
        </div>

        {healthLoading ? (
          <div className="flex items-center gap-2 py-4 text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking API keys...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {keyHealth?.map((api) => (
              <div
                key={api.envKey}
                className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-800"
              >
                <div className={`p-2 rounded-lg ${COLOR_MAP[api.name] || "text-neutral-400"} bg-neutral-800`}>
                  {ICON_MAP[api.name] || <Key className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{api.name}</div>
                  <div className="text-xs text-neutral-400">{api.envKey}</div>
                  {api.detail && (
                    <div className="text-xs text-neutral-500 mt-0.5">{api.detail}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {api.healthy ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-emerald-400">Live</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-400">{api.detail || "Down"}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
          <p>Media Agent: Image and video generation via A2E AI</p>
          <p>Social Agent: Social media content creation and publishing</p>
        </div>
      </div>
    </div>
  );
}
