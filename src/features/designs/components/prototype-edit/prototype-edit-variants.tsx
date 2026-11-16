/**
 * PROTOTYPE — throwaway. Three structural variations of the Edit surface for
 * the Specification / Creative direction slice (#7), switchable with
 * `?variant=A|B|C` and the floating bar.
 *
 * The question each variant answers: how does an owner reach one of 14 new
 * fields on a phone, without the visit losing its single History entry?
 *
 *   A — two tabs:  Design (identity + creative direction) | Specification (spec + materials)
 *   B — three tabs: Identity | Specification | Creative direction
 *   C — no tabs: one scroll, section headings (the control)
 *
 * Everything is local state. Nothing is written.
 */
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DesignDetail } from '@/features/designs';
import type { Category, Collection } from '@/features/taxonomy';
import { taxonomyLabel } from '@/features/taxonomy';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Text } from '@/shared/components/ui/text';
import { PrototypeSwitcher } from '@/shared/components/prototype-switcher';
import { DesignStatusBadge } from '../design-status-badge';
import { TaxonomySelect } from '../taxonomy-select';
import {
  DirectionBlock,
  IdentityBlock,
  PrototypeScroll,
  SectionHeading,
  SpecificationBlock,
  usePrototypeDraft,
  usePrototypeMaterials,
} from './prototype-parts';

export const PROTOTYPE_VARIANTS = ['A', 'B', 'C', 'D'] as const;

export type PrototypeVariant = (typeof PROTOTYPE_VARIANTS)[number];

const VARIANT_LABELS: Record<PrototypeVariant, string> = {
  A: 'two tabs',
  B: 'three tabs',
  C: 'one scroll',
  D: 'images + identity, two tabs',
};

/** The route param, or null when the real Edit screen should render. */
export function prototypeVariantFrom(raw: string | string[] | undefined): PrototypeVariant | null {
  const value = Array.isArray(raw) ? raw[0] : raw;

  return PROTOTYPE_VARIANTS.find((variant) => variant === value) ?? null;
}

type VariantProps = {
  design: DesignDetail;
  categories: Category[];
  collections: Collection[];
};

/** The header the real Edit screen has, so the density is honest. */
function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-4 pt-2">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Back to design"
          onPress={() => router.back()}
        >
          <Icon as={ChevronLeft} />
        </Button>
        <Text variant="small" className="text-muted-foreground">
          PROTOTYPE · {title}
        </Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

function VariantA(props: VariantProps) {
  const [tab, setTab] = useState('design');
  const draft = usePrototypeDraft(props.design);
  const materials = usePrototypeMaterials();

  return (
    <Chrome title="Two tabs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <View className="px-6 pb-2 pt-1">
          <TabsList>
            <TabsTrigger value="design">
              <Text>Design</Text>
            </TabsTrigger>
            <TabsTrigger value="specification">
              <Text>Specification</Text>
            </TabsTrigger>
          </TabsList>
        </View>

        <TabsContent value="design" className="flex-1">
          <PrototypeScroll>
            <IdentityBlock {...props} draft={draft} />
            <DirectionBlock draft={draft} />
          </PrototypeScroll>
        </TabsContent>

        <TabsContent value="specification" className="flex-1">
          <PrototypeScroll>
            <SpecificationBlock draft={draft} materials={materials} />
          </PrototypeScroll>
        </TabsContent>
      </Tabs>
    </Chrome>
  );
}

function VariantB(props: VariantProps) {
  const [tab, setTab] = useState('identity');
  const draft = usePrototypeDraft(props.design);
  const materials = usePrototypeMaterials();

  return (
    <Chrome title="Three tabs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <View className="px-6 pb-2 pt-1">
          <TabsList>
            <TabsTrigger value="identity">
              <Text>Identity</Text>
            </TabsTrigger>
            <TabsTrigger value="specification">
              <Text>Specification</Text>
            </TabsTrigger>
            <TabsTrigger value="direction">
              <Text>Creative direction</Text>
            </TabsTrigger>
          </TabsList>
        </View>

        <TabsContent value="identity" className="flex-1">
          <PrototypeScroll>
            <IdentityBlock {...props} draft={draft} />
          </PrototypeScroll>
        </TabsContent>

        <TabsContent value="specification" className="flex-1">
          <PrototypeScroll>
            <SpecificationBlock draft={draft} materials={materials} />
          </PrototypeScroll>
        </TabsContent>

        <TabsContent value="direction" className="flex-1">
          <PrototypeScroll>
            <DirectionBlock draft={draft} />
          </PrototypeScroll>
        </TabsContent>
      </Tabs>
    </Chrome>
  );
}

function VariantC(props: VariantProps) {
  const draft = usePrototypeDraft(props.design);
  const materials = usePrototypeMaterials();

  return (
    <Chrome title="One scroll">
      <PrototypeScroll>
        <SectionHeading title="Identity" />
        <IdentityBlock {...props} draft={draft} />
        <SpecificationBlock draft={draft} materials={materials} />
        <DirectionBlock draft={draft} />
      </PrototypeScroll>
    </Chrome>
  );
}

/**
 * Where the images will be. The Images slice fills this; the prototype only
 * needs its height, because that is what pushes the rest of the screen down.
 */
function ImageStrip() {
  return (
    <View className="gap-2 px-6 pt-2">
      <View className="flex-row gap-2">
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{ borderStyle: 'dashed' }}
            className="border-border h-28 flex-1 items-center justify-center rounded-lg border"
          >
            <Text variant="muted" className="text-xs">
              image
            </Text>
          </View>
        ))}
      </View>
      <Text variant="muted" className="text-xs">
        Primary, sketch, prototype — the Images slice fills this.
      </Text>
    </View>
  );
}

/** Identity as a hero: the part of a design that changes least, beside its images. */
function HeroIdentity({
  draft,
  design,
  categories,
  collections,
}: {
  draft: ReturnType<typeof usePrototypeDraft>;
  design: DesignDetail;
  categories: Category[];
  collections: Collection[];
}) {
  const category = categories.find((item) => item.id === draft.categoryId);
  const collection = collections.find((item) => item.id === draft.collectionId);
  const isEditing = (key: string) => draft.editing === key;

  return (
    <View className="gap-2 px-6 pt-4">
      <Pressable onPress={() => draft.edit('name')} accessibilityLabel="Design name">
        <Text variant="h3">{draft.name}</Text>
      </Pressable>
      {isEditing('name') ? (
        <Input
          value={draft.name}
          onChangeText={draft.setName}
          onBlur={draft.done}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={draft.done}
          accessibilityLabel="Design name field"
        />
      ) : null}

      <View className="flex-row items-center gap-2">
        <DesignStatusBadge status={design.status} />
        <Pressable onPress={() => draft.edit('identity-meta')} accessibilityLabel="Taxonomy">
          <Text variant="muted">
            {(category ? category.name : 'No category') +
              ' · ' +
              (collection ? taxonomyLabel(collection) : 'No collection')}
          </Text>
        </Pressable>
      </View>

      {isEditing('identity-meta') ? (
        <View className="gap-2">
          <TaxonomySelect
            label="Category"
            placeholder="No category"
            value={category ?? null}
            items={categories}
            disabled={false}
            onSelect={(item) => draft.setCategoryId(item?.id ?? null)}
          />
          <TaxonomySelect
            label="Collection"
            placeholder="No collection"
            value={collection ?? null}
            items={collections}
            disabled={false}
            itemLabel={taxonomyLabel}
            onSelect={(item) => draft.setCollectionId(item?.id ?? null)}
          />
          <Button size="sm" variant="ghost" className="self-end" onPress={draft.done}>
            <Text>Done</Text>
          </Button>
        </View>
      ) : null}

      <Pressable onPress={() => draft.edit('description')} accessibilityLabel="Description">
        {draft.description ? (
          <Text variant="muted" className="text-base leading-6">
            {draft.description}
          </Text>
        ) : (
          <Text variant="muted">No description</Text>
        )}
      </Pressable>
      {isEditing('description') ? (
        <View className="gap-2">
          <Input
            value={draft.description}
            onChangeText={draft.setDescription}
            multiline
            autoFocus
            className="h-24 py-2"
            textAlignVertical="top"
            accessibilityLabel="Description field"
          />
          <Button size="sm" variant="ghost" className="self-end" onPress={draft.done}>
            <Text>Done</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/**
 * D — the images and identity as one hero, then two tabs. Identity leaves the
 * tabs because it is edited least; the two long sections get the width.
 */
function VariantD(props: VariantProps) {
  const [tab, setTab] = useState('specification');
  const draft = usePrototypeDraft(props.design);
  const materials = usePrototypeMaterials();

  return (
    <Chrome title="Images + identity hero, two tabs">
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <PrototypeScroll>
          <ImageStrip />
          <HeroIdentity {...props} draft={draft} />

          <View className="px-6 pb-2 pt-5">
            <TabsList>
              <TabsTrigger value="specification">
                <Text>Specification</Text>
              </TabsTrigger>
              <TabsTrigger value="direction">
                <Text>Creative direction</Text>
              </TabsTrigger>
            </TabsList>
          </View>

          <TabsContent value="specification">
            <SpecificationBlock draft={draft} materials={materials} showHeading={false} />
          </TabsContent>
          <TabsContent value="direction">
            <DirectionBlock draft={draft} showHeading={false} />
          </TabsContent>
        </PrototypeScroll>
      </Tabs>
    </Chrome>
  );
}

/**
 * The prototype route body. Renders one variant and the switcher; the real
 * Edit form is untouched and comes back as soon as the param is gone.
 */
export function PrototypeEditVariants({
  variant,
  ...props
}: VariantProps & { variant: PrototypeVariant }) {
  return (
    <View className="flex-1">
      {variant === 'A' ? <VariantA {...props} /> : null}
      {variant === 'B' ? <VariantB {...props} /> : null}
      {variant === 'C' ? <VariantC {...props} /> : null}
      {variant === 'D' ? <VariantD {...props} /> : null}
      <PrototypeSwitcher
        variants={PROTOTYPE_VARIANTS}
        current={variant}
        label={VARIANT_LABELS[variant]}
      />
    </View>
  );
}
