import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { CheckCircle2, XCircle, RefreshCw, Key, Bell, Bot, ShieldCheck } from "lucide-react";

interface PlatformConn {
  name: string;
  id: string;
  connected: boolean;
}

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [platforms, setPlatforms] = useState<PlatformConn[]>([
    { name: "LinkedIn", id: "linkedin", connected: true },
    { name: "Lever", id: "lever", connected: true },
    { name: "Greenhouse", id: "greenhouse", connected: true },
    { name: "Workday", id: "workday", connected: false },
    { name: "Indeed", id: "indeed", connected: false },
  ]);

  const togglePlatform = (id: string) => {
    setPlatforms(platforms.map((p) => (p.id === id ? { ...p, connected: !p.connected } : p)));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Connected Platforms */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Connected Platforms</h3>
          <p className="text-sm text-muted-foreground">Manage Easy Apply session pairings for target job portals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${platform.connected ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                <div>
                  <div className="font-medium text-sm">{platform.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {platform.connected ? "Session Active" : "Disconnected"}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant={platform.connected ? "outline" : "default"}
                onClick={() => togglePlatform(platform.id)}
              >
                {platform.connected ? "Reconnect" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Default Answers & Automation Behavior */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div>
          <h3 className="font-semibold text-lg">Default Form Answers</h3>
          <p className="text-sm text-muted-foreground">Default answers for standard Easy Apply questions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Years of Experience</Label>
            <Input defaultValue="5" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Require Visa Sponsorship?</Label>
            <Input defaultValue="No" />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div>
          <h3 className="font-semibold text-lg">AI Settings</h3>
          <p className="text-sm text-muted-foreground">Configure AI provider API keys for automated resume tailoring</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">OpenAI / Gemini API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <Button size="sm" variant="secondary">Save API Key</Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 border-t border-border/50 pt-6">
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
          <div>
            <div className="font-medium text-sm">Desktop Notifications</div>
            <div className="text-xs text-muted-foreground">Get notified when queue runs finish or encounter errors</div>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>
    </div>
  );
};
