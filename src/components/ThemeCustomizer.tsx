import { useState } from "react";
import { useTheme } from "../utils/ThemeContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Palette, Type, Layout, MessageSquare, RotateCcw, X } from "lucide-react";
import { Slider } from "./ui/slider";

interface ThemeCustomizerProps {
  onClose?: () => void;
}

export function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { theme, updateTheme, resetTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("colors");

  const fontFamilies = [
    { value: "system-ui", label: "System Default" },
    { value: "Georgia, serif", label: "Georgia (Serif)" },
    { value: "'Times New Roman', serif", label: "Times New Roman" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "'Courier New', monospace", label: "Courier New" },
    { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
    { value: "'Palatino Linotype', serif", label: "Palatino" },
    { value: "Verdana, sans-serif", label: "Verdana" },
  ];

  const presetThemes = [
    {
      name: "Warm Poetry",
      colors: {
        primaryColor: "#d4756f",
        secondaryColor: "#c9a28f",
        accentColor: "#fce4da",
        backgroundColor: "#fef9f5",
        textColor: "#2d2424",
      },
    },
    {
      name: "Ocean Breeze",
      colors: {
        primaryColor: "#4a90a4",
        secondaryColor: "#7bc8d9",
        accentColor: "#e0f4f7",
        backgroundColor: "#f0f9fa",
        textColor: "#1a3a42",
      },
    },
    {
      name: "Forest Dream",
      colors: {
        primaryColor: "#5a8f69",
        secondaryColor: "#88b896",
        accentColor: "#d4e8d8",
        backgroundColor: "#f4f8f5",
        textColor: "#2a3f2e",
      },
    },
    {
      name: "Lavender Field",
      colors: {
        primaryColor: "#9b7eb8",
        secondaryColor: "#c4a7d8",
        accentColor: "#f0e6f7",
        backgroundColor: "#f9f5fc",
        textColor: "#3d2a4a",
      },
    },
    {
      name: "Sunset Glow",
      colors: {
        primaryColor: "#e07856",
        secondaryColor: "#f4a261",
        accentColor: "#fce4d6",
        backgroundColor: "#fff8f2",
        textColor: "#3a2418",
      },
    },
    {
      name: "Midnight Blue",
      colors: {
        primaryColor: "#4a5899",
        secondaryColor: "#7582c4",
        accentColor: "#e3e6f5",
        backgroundColor: "#f2f3f9",
        textColor: "#1e2440",
      },
    },
  ];

  const borderRadiusOptions = [
    { value: "0rem", label: "Square" },
    { value: "0.5rem", label: "Slightly Rounded" },
    { value: "1rem", label: "Rounded" },
    { value: "1.5rem", label: "Very Rounded" },
    { value: "2rem", label: "Extra Rounded" },
  ];

  const fontSizeToPixels = (size: string) => parseInt(size);
  const pixelsToFontSize = (pixels: number) => `${pixels}px`;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border backdrop-blur-md rounded-2xl shadow-lg overflow-hidden" style={{ borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-card-bg)', opacity: 0.95 }}>
        <div className="border-b border-[var(--theme-primary)]/20 p-4 flex items-center justify-between bg-gradient-to-r from-[var(--theme-accent)]/30 to-[var(--theme-accent)]/10">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-[var(--theme-primary)]" />
            <div>
              <h2 className="text-[var(--theme-text)]">Theme Customizer</h2>
              <p className="text-sm text-[var(--theme-text)]/60">Personalize your experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetTheme}
              variant="outline"
              size="sm"
              className="border-[var(--theme-primary)]/30 text-[var(--theme-primary)] hover:bg-[var(--theme-accent)] rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="icon" className="hover:bg-[var(--theme-accent)]">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-[var(--theme-accent)]/50 mb-6 gap-1 md:gap-0">
              <TabsTrigger value="colors" className="text-xs md:text-sm">
                <Palette className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Colors</span>
                <span className="md:hidden">Color</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="text-xs md:text-sm">
                <Type className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Typography</span>
                <span className="md:hidden">Type</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="text-xs md:text-sm">
                <Layout className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Layout</span>
                <span className="md:hidden">Style</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs md:text-sm">
                <MessageSquare className="w-4 h-4 mr-1 md:mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6">
              <div>
                <h3 className="text-[var(--theme-text)] mb-4">Preset Themes</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {presetThemes.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => updateTheme(preset.colors)}
                      className="p-4 rounded-xl border-2 border-[var(--theme-primary)]/20 hover:border-[var(--theme-primary)] transition-all text-left"
                    >
                      <div className="flex gap-1 mb-2">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.colors.primaryColor }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.colors.secondaryColor }}
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: preset.colors.accentColor }}
                        />
                      </div>
                      <p className="text-sm text-[var(--theme-text)]">{preset.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[var(--theme-text)] mb-2">Custom Colors</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                        className="w-16 h-10 p-1 rounded-lg"
                      />
                      <Input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={theme.secondaryColor}
                        onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                        className="w-16 h-10 p-1 rounded-lg"
                      />
                      <Input
                        type="text"
                        value={theme.secondaryColor}
                        onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="accentColor"
                        type="color"
                        value={theme.accentColor}
                        onChange={(e) => updateTheme({ accentColor: e.target.value })}
                        className="w-16 h-10 p-1 rounded-lg"
                      />
                      <Input
                        type="text"
                        value={theme.accentColor}
                        onChange={(e) => updateTheme({ accentColor: e.target.value })}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={theme.backgroundColor}
                        onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                        className="w-16 h-10 p-1 rounded-lg"
                      />
                      <Input
                        type="text"
                        value={theme.backgroundColor}
                        onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="textColor"
                        type="color"
                        value={theme.textColor}
                        onChange={(e) => updateTheme({ textColor: e.target.value })}
                        className="w-16 h-10 p-1 rounded-lg"
                      />
                      <Input
                        type="text"
                        value={theme.textColor}
                        onChange={(e) => updateTheme({ textColor: e.target.value })}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-6">
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select value={theme.fontFamily} onValueChange={(value) => updateTheme({ fontFamily: value })}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fontSize">Font Size: {theme.fontSize}</Label>
                <Slider
                  id="fontSize"
                  min={12}
                  max={20}
                  step={1}
                  value={[fontSizeToPixels(theme.fontSize)]}
                  onValueChange={(value) => updateTheme({ fontSize: pixelsToFontSize(value[0]) })}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-[var(--theme-text)]/60 mt-1">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--theme-accent)]/30 border border-[var(--theme-primary)]/10">
                <p className="text-[var(--theme-text)]" style={{ fontFamily: theme.fontFamily, fontSize: theme.fontSize }}>
                  The quick brown fox jumps over the lazy dog. This is a preview of your selected font family and size.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-6">
              <div>
                <Label htmlFor="borderRadius">Border Radius</Label>
                <Select value={theme.borderRadius} onValueChange={(value) => updateTheme({ borderRadius: value })}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {borderRadiusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cardStyle">Card Style</Label>
                <Select value={theme.cardStyle} onValueChange={(value: any) => updateTheme({ cardStyle: value })}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="glass">Glass (Frosted)</SelectItem>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`p-4 rounded-xl border ${
                    theme.cardStyle === "glass"
                      ? "bg-white/80 backdrop-blur-sm border-[var(--theme-primary)]/20"
                      : theme.cardStyle === "solid"
                      ? "bg-white border-[var(--theme-primary)]/20"
                      : "bg-transparent border border-[var(--theme-primary)]/30"
                  }`}
                  style={{ borderRadius: theme.borderRadius }}
                >
                  <p className="text-sm text-[var(--theme-text)]">Card Preview</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="space-y-6">
              <div>
                <Label htmlFor="chatBubbleStyle">Chat Bubble Style</Label>
                <Select value={theme.chatBubbleStyle} onValueChange={(value: any) => updateTheme({ chatBubbleStyle: value })}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="bubble">Speech Bubble</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chatMyMessageBg">My Message Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="chatMyMessageBg"
                      type="color"
                      value={theme.chatMyMessageBg}
                      onChange={(e) => updateTheme({ chatMyMessageBg: e.target.value })}
                      className="w-16 h-10 p-1 rounded-lg"
                    />
                    <Input
                      type="text"
                      value={theme.chatMyMessageBg}
                      onChange={(e) => updateTheme({ chatMyMessageBg: e.target.value })}
                      className="flex-1 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="chatOtherMessageBg">Other Message Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="chatOtherMessageBg"
                      type="color"
                      value={theme.chatOtherMessageBg}
                      onChange={(e) => updateTheme({ chatOtherMessageBg: e.target.value })}
                      className="w-16 h-10 p-1 rounded-lg"
                    />
                    <Input
                      type="text"
                      value={theme.chatOtherMessageBg}
                      onChange={(e) => updateTheme({ chatOtherMessageBg: e.target.value })}
                      className="flex-1 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-[var(--theme-accent)]/30 border border-[var(--theme-primary)]/10">
                <p className="text-sm text-[var(--theme-text)]/60 mb-3">Chat Preview:</p>
                <div className="flex justify-end">
                  <div
                    className={`px-4 py-2 max-w-[70%] text-white ${
                      theme.chatBubbleStyle === "bubble" ? "rounded-2xl rounded-br-sm" : ""
                    }`}
                    style={{
                      backgroundColor: theme.chatMyMessageBg,
                      borderRadius: theme.chatBubbleStyle === "square" ? "0.25rem" : theme.chatBubbleStyle === "bubble" ? "1.5rem" : theme.borderRadius,
                    }}
                  >
                    My message
                  </div>
                </div>
                <div className="flex justify-start">
                  <div
                    className={`px-4 py-2 max-w-[70%] ${
                      theme.chatBubbleStyle === "bubble" ? "rounded-2xl rounded-bl-sm" : ""
                    }`}
                    style={{
                      backgroundColor: theme.chatOtherMessageBg,
                      color: theme.textColor,
                      borderRadius: theme.chatBubbleStyle === "square" ? "0.25rem" : theme.chatBubbleStyle === "bubble" ? "1.5rem" : theme.borderRadius,
                      border: `1px solid ${theme.primaryColor}20`,
                    }}
                  >
                    Their message
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}