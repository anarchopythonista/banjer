import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { AppShell } from "./AppShell";

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  args: {
    persistTheme: false,
  },
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Banjer home" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Edit title: Untitled" })).toBeInTheDocument();
  },
};

export const DarkMode: Story = {
  args: {
    initialTheme: "dark",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  },
};

export const ToggleThemeInteraction: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Switch to dark mode" }));
    await expect(canvas.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  },
};
