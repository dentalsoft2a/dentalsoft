import { useEffect, useState } from 'react';
import { Palette, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ResourceVariant {
  id: string;
  subcategory: string;
  variant_name: string;
  stock_quantity: number;
  is_active: boolean;
}

interface ResourceWithVariants {
  resource_id: string;
  resource_name: string;
  has_variants: boolean;
  subcategories: Record<string, ResourceVariant[]>;
  selectedVariantId?: string;
}

interface ResourceVariantSelectorProps {
  catalogItemId: string;
  onSelect: (selections: Record<string, string>) => void;
  selectedVariants?: Record<string, string>;
}

export default function ResourceVariantSelector({
  catalogItemId,
  onSelect,
  selectedVariants = {}
}: ResourceVariantSelectorProps) {
  const [resources, setResources] = useState<ResourceWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>(selectedVariants);

  useEffect(() => {
    loadResourcesWithVariants();
  }, [catalogItemId]);

  useEffect(() => {
    setSelections(selectedVariants);
  }, [selectedVariants]);

  const loadResourcesWithVariants = async () => {
    try {
      const { data: catalogResources, error: catalogError } = await supabase
        .from('catalog_item_resources')
        .select('resource_id, resources!inner(id, name, has_variants)')
        .eq('catalog_item_id', catalogItemId);

      if (catalogError) throw catalogError;

      if (catalogResources && catalogResources.length > 0) {
        const resourcesWithVariants: ResourceWithVariants[] = [];

        for (const catalogResource of catalogResources) {
          const resource = (catalogResource as any).resources;

          if (resource.has_variants) {
            const { data: variantsData, error: variantsError } = await supabase
              .from('resource_variants')
              .select('id, subcategory, variant_name, stock_quantity, is_active')
              .eq('resource_id', resource.id)
              .eq('is_active', true)
              .order('subcategory, variant_name', { ascending: true });

            if (variantsError) throw variantsError;

            const groupedVariants = (variantsData || []).reduce((acc, variant) => {
              const subcat = variant.subcategory || 'Sans catégorie';
              if (!acc[subcat]) {
                acc[subcat] = [];
              }
              acc[subcat].push(variant);
              return acc;
            }, {} as Record<string, ResourceVariant[]>);

            resourcesWithVariants.push({
              resource_id: resource.id,
              resource_name: resource.name,
              has_variants: true,
              subcategories: groupedVariants
            });
          }
        }

        setResources(resourcesWithVariants);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = (resourceId: string, variantId: string) => {
    const newSelections = { ...selections, [resourceId]: variantId };
    setSelections(newSelections);
    onSelect(newSelections);
  };

  if (loading) {
    return (
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">Chargement des variantes...</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => {
        const selectedVariantId = selections[resource.resource_id];
        const missingSelection = !selectedVariantId;

        return (
          <div
            key={resource.resource_id}
            className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5 text-cyan-600" />
              <h4 className="font-semibold text-slate-900">
                Sélectionner la variante de {resource.resource_name}
              </h4>
            </div>

            {missingSelection && (
              <div className="flex items-start gap-2 mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800">
                  Vous devez sélectionner une variante pour déduire le stock correctement
                </p>
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(resource.subcategories).map(([subcategory, variants]) => (
                <div key={subcategory}>
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="text-sm font-bold text-slate-700">{subcategory}</h5>
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full">
                      {variants.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleSelectVariant(resource.resource_id, variant.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedVariantId === variant.id
                            ? 'border-cyan-500 bg-cyan-100 shadow-md'
                            : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{variant.variant_name}</span>
                          {selectedVariantId === variant.id && (
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          Stock: <span className="font-semibold">{Number(variant.stock_quantity)}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
