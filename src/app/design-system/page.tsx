import type { Metadata } from "next";

import { Badge } from "@/components/mealflo/badge";
import { Button, ButtonLink } from "@/components/mealflo/button";
import { Card, CardHeader, InsetCard } from "@/components/mealflo/card";
import { ModalPreview, SheetPreview } from "@/components/mealflo/dialog";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import {
  IconSwatch,
  MealfloIcon,
  iconNames,
  type IconName,
} from "@/components/mealflo/icon";
import { MetricTile, PageFrame, PageHeader } from "@/components/mealflo/layout";
import {
  MapOverlayCard,
  MapOverlayStack,
  MapOverlayStat,
} from "@/components/mealflo/map-overlay";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/mealflo/table";
import {
  driverStops,
  inventoryMeals,
  liveMarkers,
  routeLine,
} from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Design system",
};

export default function DesignSystemPage() {
  return (
    <div className="bg-bg min-h-screen">
      <PageFrame maxWidthClassName="max-w-[1400px]">
        <PageHeader
          title="Mealflo design system in app"
          note="This page makes the real app primitives easy to inspect before other surfaces build on top of them."
          actions={
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/" size="sm" variant="secondary">
                Back to entry
              </ButtonLink>
              <ButtonLink href="/admin" size="sm" variant="primary">
                Open admin
              </ButtonLink>
            </div>
          }
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <Card className="space-y-5">
            <CardHeader
              title="Type and tone"
              note="Sentence case, practical labels, and a warm product voice stay consistent across the app."
            />
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="font-display text-ink text-[52px] font-bold tracking-[-0.04em]">
                  Keep the next action easy to spot.
                </h2>
                <p className="text-muted max-w-[42rem] text-lg leading-8">
                  The product copy stays calm, useful, and direct. It explains
                  what is happening now, not what the interface wants to say
                  about itself.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile
                  icon="notification-bell"
                  label="New intake"
                  tone="warning"
                  note="4 need review"
                  value="6"
                />
                <MetricTile
                  icon="route-road"
                  label="Routes ready"
                  tone="info"
                  note="2 active now"
                  value="4"
                />
                <MetricTile
                  icon="grocery-bag"
                  label="Meals ready"
                  tone="warm"
                  note="8 need refrigeration"
                  value="42"
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Buttons and badges"
              note="Borders and spacing carry the depth. Motion stays subtle."
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="warm">Warm action</Button>
              <Button variant="quiet">Quiet</Button>
              <Button variant="danger">Couldn&apos;t deliver</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">On track</Badge>
              <Badge tone="warning">Needs attention</Badge>
              <Badge tone="info">MapLibre ready</Badge>
              <Badge tone="neutral">Review later</Badge>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="space-y-4">
            <CardHeader
              title="Fields"
              note="Inputs, selects, and textareas keep labels visible and touch targets generous."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" htmlFor="gallery-name">
                <Input id="gallery-name" placeholder="Full name" />
              </Field>
              <Field label="Contact method" htmlFor="gallery-contact">
                <Input
                  id="gallery-contact"
                  leadingIcon="phone-handset"
                  placeholder="Phone or email"
                />
              </Field>
              <Field label="Availability" htmlFor="gallery-availability">
                <Select id="gallery-availability" defaultValue="">
                  <option value="">Choose an option</option>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                </Select>
              </Field>
              <Field label="Dietary flags" htmlFor="gallery-dietary">
                <Input
                  id="gallery-dietary"
                  leadingIcon="allergy-peanut"
                  placeholder="Optional"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Access notes" htmlFor="gallery-access">
                  <Textarea
                    id="gallery-access"
                    placeholder="Buzzer, stairs, side door, or other delivery notes"
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Icons"
              note="The app uses only the custom Mealflo PNG set."
            />
            <div className="grid grid-cols-4 gap-3">
              {iconNames.map((name) => (
                <InsetCard
                  key={name}
                  className="flex flex-col items-center justify-center gap-2 px-3 py-4 text-center"
                >
                  <IconSwatch
                    name={name as IconName}
                    size={34}
                    swatchSize={56}
                    tone="surface"
                  />
                  <span className="text-muted text-[11px] leading-4">
                    {name}
                  </span>
                </InsetCard>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="space-y-4">
            <CardHeader
              title="Table and list"
              note="Structured operational data uses semantic table markup and warm bordered rows."
            />
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Meal</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Tags</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryMeals.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted">
                      {item.category}
                    </TableCell>
                    <TableCell className="font-display text-lg font-semibold">
                      {item.quantity}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="space-y-4">
            <CardHeader
              title="Inset lists"
              note="Sub-panels use tint and borders instead of shadow-heavy cards."
            />
            <div className="grid gap-3">
              {driverStops.map((stop) => (
                <InsetCard key={stop.id} className="flex items-start gap-4">
                  <IconSwatch
                    name={stop.status === "Now" ? "clock" : "route-stops"}
                    size={30}
                    swatchSize={52}
                    tone="surface"
                  />
                  <div className="space-y-1">
                    <p className="text-ink font-medium">{stop.name}</p>
                    <p className="text-muted text-sm">{stop.address}</p>
                    <p className="text-ink text-sm leading-6">{stop.items}</p>
                  </div>
                </InsetCard>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="space-y-4">
            <CardHeader
              title="Map overlays"
              note="Overlay cards and stats sit above the map without becoming a floating dashboard."
            />
            <MapCanvas
              className="h-[420px]"
              markers={liveMarkers}
              path={routeLine}
            >
              <MapOverlayStack align="top-left">
                <MapOverlayStat
                  icon="delivery-van"
                  label="Routes moving"
                  tone="success"
                  value="2 drivers active"
                />
              </MapOverlayStack>
              <MapOverlayStack align="bottom-right">
                <MapOverlayCard className="space-y-2">
                  <Badge size="sm" tone="warning">
                    Next stop in 8 min
                  </Badge>
                  <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.03em]">
                    Margaret Okafor
                  </p>
                  <p className="text-muted text-sm leading-6">
                    Call before using the side entrance. One soup pack is in the
                    blue tote.
                  </p>
                </MapOverlayCard>
              </MapOverlayStack>
            </MapCanvas>
          </Card>

          <div className="grid gap-4">
            <ModalPreview
              title="Confirm route approval"
              note="Modals stay lightly elevated and rely on borders before shadow."
              actions={
                <>
                  <Button variant="secondary">Cancel</Button>
                  <Button variant="primary">Approve route</Button>
                </>
              }
            >
              <p className="text-muted text-sm leading-6">
                Approving this route assigns the driver, locks the stop order,
                and sends the handoff into live operations.
              </p>
            </ModalPreview>

            <SheetPreview edge="bottom" title="Driver bottom sheet">
              <div className="space-y-3">
                <p className="text-muted text-sm leading-6">
                  The driver mode uses a bottom sheet to keep the current stop
                  and actions easy to reach on phones.
                </p>
                <InsetCard className="flex items-start gap-3">
                  <MealfloIcon name="grocery-bag" size={34} />
                  <p className="text-ink text-sm leading-6">
                    2 meal trays, 1 soup pack
                  </p>
                </InsetCard>
              </div>
            </SheetPreview>
          </div>
        </div>
      </PageFrame>
    </div>
  );
}
