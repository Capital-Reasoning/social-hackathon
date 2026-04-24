import type { StaticImageData } from "next/image";
import Image from "next/image";

import allergyPeanut from "../../../design/assets/icons/allergy-peanut.png";
import calendar from "../../../design/assets/icons/calendar.png";
import chatBubble from "../../../design/assets/icons/chat-bubble.png";
import checklist from "../../../design/assets/icons/checklist.png";
import checkmarkCircle from "../../../design/assets/icons/checkmark-circle.png";
import clock from "../../../design/assets/icons/clock.png";
import closeX from "../../../design/assets/icons/close-x.png";
import deliveryVan from "../../../design/assets/icons/delivery-van.png";
import door from "../../../design/assets/icons/door.png";
import exportIcon from "../../../design/assets/icons/export.png";
import filterSliders from "../../../design/assets/icons/filter-sliders.png";
import flag from "../../../design/assets/icons/flag.png";
import forkKnife from "../../../design/assets/icons/fork-knife.png";
import fridge from "../../../design/assets/icons/fridge.png";
import groceryBag from "../../../design/assets/icons/grocery-bag.png";
import group from "../../../design/assets/icons/group.png";
import heart from "../../../design/assets/icons/heart.png";
import homeHouse from "../../../design/assets/icons/home-house.png";
import locationPin from "../../../design/assets/icons/location-pin.png";
import magnifyingGlass from "../../../design/assets/icons/magnifying-glass.png";
import mealContainer from "../../../design/assets/icons/meal-container.png";
import notificationBell from "../../../design/assets/icons/notification-bell.png";
import pencilEdit from "../../../design/assets/icons/pencil-edit.png";
import personCheck from "../../../design/assets/icons/person-check.png";
import personPlus from "../../../design/assets/icons/person-plus.png";
import phoneHandset from "../../../design/assets/icons/phone-handset.png";
import plus from "../../../design/assets/icons/plus.png";
import repeatArrows from "../../../design/assets/icons/repeat-arrows.png";
import routeRoad from "../../../design/assets/icons/route-road.png";
import routeStops from "../../../design/assets/icons/route-stops.png";
import sendAirplane from "../../../design/assets/icons/send-airplane.png";
import settingsGear from "../../../design/assets/icons/settings-gear.png";
import shieldCheck from "../../../design/assets/icons/shield-check.png";
import snowflake from "../../../design/assets/icons/snowflake.png";
import star from "../../../design/assets/icons/star.png";
import userProfile from "../../../design/assets/icons/user-profile.png";
import warningAlert from "../../../design/assets/icons/warning-alert.png";

import { cn } from "@/lib/utils";

const iconCatalog = {
  "allergy-peanut": {
    label: "Peanut allergy",
    src: allergyPeanut,
  },
  calendar: { label: "Calendar", src: calendar },
  "chat-bubble": { label: "Message", src: chatBubble },
  checklist: { label: "Checklist", src: checklist },
  "checkmark-circle": {
    label: "Completed",
    src: checkmarkCircle,
  },
  clock: { label: "Time", src: clock },
  "close-x": { label: "Close", src: closeX },
  "delivery-van": { label: "Delivery van", src: deliveryVan },
  door: { label: "Door", src: door },
  export: { label: "Export", src: exportIcon },
  "filter-sliders": { label: "Filters", src: filterSliders },
  flag: { label: "Flag", src: flag },
  "fork-knife": { label: "Meal", src: forkKnife },
  fridge: { label: "Refrigerated storage", src: fridge },
  "grocery-bag": { label: "Grocery bag", src: groceryBag },
  group: { label: "Group", src: group },
  heart: { label: "Heart", src: heart },
  "home-house": { label: "Home", src: homeHouse },
  "location-pin": { label: "Location", src: locationPin },
  "magnifying-glass": { label: "Search", src: magnifyingGlass },
  "meal-container": { label: "Meal container", src: mealContainer },
  "notification-bell": { label: "Notifications", src: notificationBell },
  "pencil-edit": { label: "Edit", src: pencilEdit },
  "person-check": { label: "Checked person", src: personCheck },
  "person-plus": { label: "Add person", src: personPlus },
  "phone-handset": { label: "Phone", src: phoneHandset },
  plus: { label: "Add", src: plus },
  "repeat-arrows": { label: "Repeat", src: repeatArrows },
  "route-road": { label: "Route", src: routeRoad },
  "route-stops": { label: "Stops", src: routeStops },
  "send-airplane": { label: "Send", src: sendAirplane },
  "settings-gear": { label: "Settings", src: settingsGear },
  "shield-check": { label: "Safe", src: shieldCheck },
  snowflake: { label: "Needs refrigeration", src: snowflake },
  star: { label: "Star", src: star },
  "user-profile": { label: "Profile", src: userProfile },
  "warning-alert": { label: "Warning", src: warningAlert },
} satisfies Record<string, { label: string; src: StaticImageData }>;

export type IconName = keyof typeof iconCatalog;

type MealfloIconProps = {
  alt?: string;
  name: IconName;
  className?: string;
  decorative?: boolean;
  label?: string;
  size?: number;
};

export function MealfloIcon({
  alt,
  name,
  className,
  decorative = true,
  label,
  size = 24,
}: MealfloIconProps) {
  const asset = iconCatalog[name];
  const resolvedDecorative = alt ? false : decorative;
  const resolvedLabel = alt || label || asset.label;

  return (
    <Image
      src={asset.src}
      alt={resolvedDecorative ? "" : resolvedLabel}
      aria-hidden={resolvedDecorative ? true : undefined}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

type IconSwatchProps = {
  name: IconName;
  className?: string;
  decorative?: boolean;
  framed?: boolean;
  iconClassName?: string;
  label?: string;
  size?: number;
  swatchSize?: number;
  tone?: "surface" | "tint" | "action" | "warm";
};

const swatchToneClasses: Record<
  NonNullable<IconSwatchProps["tone"]>,
  string
> = {
  action: "bg-[var(--mf-color-blue-50)] border-[rgba(120,144,250,0.26)]",
  surface: "bg-white border-line",
  tint: "bg-surface-tint border-line",
  warm: "bg-[rgba(250,226,120,0.24)] border-[rgba(170,120,0,0.22)]",
};

export function IconSwatch({
  name,
  className,
  decorative = true,
  framed = false,
  iconClassName,
  label,
  size = 26,
  swatchSize = 48,
  tone = "surface",
}: IconSwatchProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        framed && "rounded-full border-[1.5px]",
        framed && swatchToneClasses[tone],
        className
      )}
      style={{ width: swatchSize, height: swatchSize }}
    >
      <MealfloIcon
        name={name}
        decorative={decorative}
        label={label}
        size={size}
        className={iconClassName}
      />
    </span>
  );
}

export const iconNames = Object.keys(iconCatalog) as IconName[];
