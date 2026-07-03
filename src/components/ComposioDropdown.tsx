import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plug,
  Unplug,
  Loader2,
  Zap,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const platformConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  INSTAGRAM: {
    label: "Instagram",
    icon: <Instagram className="h-4 w-4" />,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  TIKTOK: {
    label: "TikTok",
    icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  FACEBOOK: {
    label: "Facebook",
    icon: <Facebook className="h-4 w-4" />,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  TWITTER: {
    label: "X (Twitter)",
    icon: <Twitter className="h-4 w-4" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  YOUTUBE: {
    label: "YouTube",
    icon: <Youtube className="h-4 w-4" />,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  REDDIT: {
    label: "Reddit",
    icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};

export default function ComposioDropdown() {
  const utils = trpc.useUtils();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  const { data: connections } = trpc.composio.getConnections.useQuery();
  const { data: actionsData } = trpc.composio.listActions.useQuery(
    { appName: selectedPlatform },
    { enabled: !!selectedPlatform }
  );

  const initiate = trpc.composio.initiateConnection.useMutation({
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank");
        toast.success("Opening Composio auth...");
      }
      utils.composio.getConnections.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? "Connection failed");
    },
  });

  const execute = trpc.composio.executeAction.useMutation({
    onSuccess: () => {
      toast.success("Action executed!");
    },
    onError: (err) => {
      toast.error(err.message ?? "Action failed");
    },
  });

  const isConnected = (appName: string) =>
    connections?.connections?.some(
      (c: { appName?: string; status?: string }) => c.appName?.toUpperCase() === appName && c.status === "ACTIVE"
    );

  const connectedApps = connections?.connections?.filter((c: { status?: string }) => c.status === "ACTIVE") ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Composio Integrations</h3>
          <p className="text-xs text-neutral-400">
            {connectedApps.length} of 6 platforms connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {Object.entries(platformConfig).map(([key, config]) => {
          const connected = isConnected(key);
          return (
            <button
              key={key}
              onClick={() => setSelectedPlatform(selectedPlatform === key ? "" : key)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                selectedPlatform === key
                  ? `${config.bg} border-current`
                  : "bg-neutral-800/50 border-neutral-800 hover:border-neutral-700"
              )}
            >
              <span className={config.color}>{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium", connected ? "text-white" : "text-neutral-400")}>
                  {config.label}
                </div>
              </div>
              {connected ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Unplug className="h-4 w-4 text-neutral-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Dropdown Panel */}
      {selectedPlatform && (
        <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">
              {platformConfig[selectedPlatform]?.label} Actions
            </span>
            {isConnected(selectedPlatform) ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="text-xs text-neutral-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Not connected
              </span>
            )}
          </div>

          {/* Connection Button */}
          {!isConnected(selectedPlatform) && (
            <Button
              onClick={() => initiate.mutate({ appName: selectedPlatform })}
              disabled={initiate.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {initiate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plug className="h-4 w-4 mr-2" />
              )}
              Connect {platformConfig[selectedPlatform]?.label}
            </Button>
          )}

          {/* Action Dropdown */}
          {isConnected(selectedPlatform) && (
            <>
              <Select onValueChange={(v) => setSelectedAction(v)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                  <SelectValue placeholder="Select an action..." />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700 max-h-60">
                  {(actionsData?.actions ?? []).length === 0 ? (
                    <SelectItem value="none" disabled className="text-neutral-500">
                      No actions available
                    </SelectItem>
                  ) : (
                    actionsData?.actions?.map((action: { name: string; displayName?: string; description?: string }) => (
                      <SelectItem
                        key={action.name}
                        value={action.name}
                        className="text-white"
                      >
                        <div className="flex flex-col">
                          <span>{action.displayName ?? action.name}</span>
                          <span className="text-xs text-neutral-500 truncate max-w-[280px]">
                            {action.description ?? ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedAction && (
                <Button
                  onClick={() =>
                    execute.mutate({
                      actionName: selectedAction,
                      params: {},
                    })
                  }
                  disabled={execute.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                  size="sm"
                >
                  {execute.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Execute Action
                </Button>
              )}
            </>
          )}

          {/* Manual Composio Link */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-neutral-400 hover:text-white"
            onClick={() =>
              window.open(
                `https://app.composio.dev/app/${selectedPlatform.toLowerCase()}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in Composio Dashboard
          </Button>
        </div>
      )}

      {/* Connection Summary */}
      {connectedApps.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="text-xs text-emerald-400 font-medium mb-2">
            Active Connections
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedApps.map((conn: { id: string; appName?: string; status?: string }) => {
              const cfg = platformConfig[conn.appName?.toUpperCase() ?? ""];
              return (
                <span
                  key={conn.id}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full flex items-center gap-1",
                    cfg?.bg ?? "bg-neutral-800",
                    cfg?.color ?? "text-neutral-400"
                  )}
                >
                  {cfg?.icon}
                  {cfg?.label ?? conn.appName}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
