import { supabase } from '../lib/supabase';

interface DemoDataResult {
  success: boolean;
  error?: string;
  data?: {
    dentists: any[];
    patients: any[];
    catalogItems: any[];
    resources: any[];
    deliveryNotes: any[];
    proformas: any[];
    invoices: any[];
  };
}

const frenchFirstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Claire', 'Michel', 'Anne', 'Philippe', 'Isabelle', 'François', 'Catherine', 'Alain', 'Martine', 'Bernard'];
const frenchLastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'];
const frenchCities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Strasbourg', 'Lille', 'Rennes'];
const streets = ['Rue de la République', 'Avenue des Champs', 'Boulevard Victor Hugo', 'Place de la Mairie', 'Rue Jean Jaurès', 'Avenue Foch', 'Rue Nationale', 'Boulevard Gambetta'];

const catalogCategories = [
  { name: 'Couronnes', items: ['Couronne céramique', 'Couronne zircone', 'Couronne céramo-métallique', 'Couronne provisoire'] },
  { name: 'Bridges', items: ['Bridge 3 éléments', 'Bridge 4 éléments', 'Bridge complet', 'Bridge cantilever'] },
  { name: 'Prothèses', items: ['Prothèse amovible partielle', 'Prothèse complète', 'Prothèse sur implants', 'Prothèse squelettée'] },
  { name: 'Implants', items: ['Pilier implantaire', 'Couronne sur implant', 'Bridge sur implants', 'Barre de rétention'] },
  { name: 'Orthodontie', items: ['Gouttière thermoformée', 'Appareil de contention', 'Plaque palatine', 'Arc lingual'] }
];

const teintes = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'C2', 'D2', 'D3'];
const dents = ['11', '12', '13', '14', '15', '16', '17', '18', '21', '22', '23', '24', '25', '26', '27', '28', '31', '32', '33', '34', '35', '36', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split('T')[0];
}

function getRandomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function generateDemoData(userId: string): Promise<DemoDataResult> {
  try {
    console.log('Starting demo data generation for user:', userId);

    // 1. Générer 8 dentistes
    const dentists = [];
    for (let i = 0; i < 8; i++) {
      const firstName = getRandomElement(frenchFirstNames);
      const lastName = getRandomElement(frenchLastNames);
      const city = getRandomElement(frenchCities);
      const street = getRandomElement(streets);
      const streetNumber = Math.floor(Math.random() * 200) + 1;
      const postalCode = Math.floor(Math.random() * 90000) + 10000;

      const { data, error } = await supabase
        .from('dentists')
        .insert({
          user_id: userId,
          name: `Dr ${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cabinet-dentaire.fr`,
          phone: `0${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
          address: `${streetNumber} ${street}, ${postalCode} ${city}`
        })
        .select()
        .single();

      if (error) throw error;
      dentists.push(data);
    }

    console.log('Generated dentists:', dentists.length);

    // 2. Générer 15 patients
    const patients = [];
    for (let i = 0; i < 15; i++) {
      const firstName = getRandomElement(frenchFirstNames);
      const lastName = getRandomElement(frenchLastNames);
      const birthYear = 1940 + Math.floor(Math.random() * 60);

      const { data, error } = await supabase
        .from('patients')
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: `${birthYear}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
          phone: `0${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
          patient_code: `P${String(i + 1).padStart(4, '0')}`
        })
        .select()
        .single();

      if (error) throw error;
      patients.push(data);
    }

    console.log('Generated patients:', patients.length);

    // 3. Générer 20 articles de catalogue
    const catalogItems = [];
    let itemIndex = 0;
    for (const category of catalogCategories) {
      for (const itemName of category.items) {
        const { data, error } = await supabase
          .from('catalog_items')
          .insert({
            user_id: userId,
            name: itemName,
            category: category.name,
            default_price: getRandomPrice(80, 450),
            default_unit: 'unité',
            is_active: true,
            track_stock: false
          })
          .select()
          .single();

        if (error) throw error;
        catalogItems.push(data);
        itemIndex++;
      }
    }

    console.log('Generated catalog items:', catalogItems.length);

    // 4. Générer 10 ressources avec variants
    const resources = [];
    const resourceTypes = [
      { name: 'Résine PMMA', unit: 'ml', hasVariants: true, variants: ['Rose pâle', 'Rose moyen', 'Rose foncé'] },
      { name: 'Céramique IPS E.max', unit: 'g', hasVariants: true, variants: ['A1', 'A2', 'A3', 'B1'] },
      { name: 'Zircone blanc', unit: 'bloc', hasVariants: false, variants: [] },
      { name: 'Alliage Co-Cr', unit: 'g', hasVariants: false, variants: [] },
      { name: 'Cire de modelage', unit: 'plaque', hasVariants: true, variants: ['Rouge', 'Rose', 'Bleu'] }
    ];

    for (const resourceType of resourceTypes) {
      const { data, error } = await supabase
        .from('resources')
        .insert({
          user_id: userId,
          name: resourceType.name,
          unit: resourceType.unit,
          has_variants: resourceType.hasVariants,
          track_stock: true,
          stock_quantity: resourceType.hasVariants ? 0 : Math.floor(Math.random() * 100) + 50,
          low_stock_threshold: 20
        })
        .select()
        .single();

      if (error) throw error;
      resources.push(data);

      // Créer les variants si nécessaire
      if (resourceType.hasVariants && resourceType.variants.length > 0) {
        for (const variantName of resourceType.variants) {
          await supabase
            .from('resource_variants')
            .insert({
              resource_id: data.id,
              variant_name: variantName,
              stock_quantity: Math.floor(Math.random() * 50) + 20,
              low_stock_threshold: 10,
              is_active: true
            });
        }
      }
    }

    console.log('Generated resources:', resources.length);

    // 5. Générer 25 bons de livraison
    const deliveryNotes = [];
    const statuses = ['pending', 'in_progress', 'completed', 'validated'];

    for (let i = 0; i < 25; i++) {
      const dentist = getRandomElement(dentists);
      const patient = getRandomElement(patients);
      const selectedTeeth = getRandomElements(dents, Math.floor(Math.random() * 4) + 1);
      const teinte = getRandomElement(teintes);
      const catalogItem = getRandomElement(catalogItems);
      const date = getRandomDate(90);
      const status = i < 5 ? 'pending' : i < 10 ? 'in_progress' : getRandomElement(statuses);

      const items = [{
        code: catalogItem.name,
        description: catalogItem.name,
        teeth: selectedTeeth,
        shade: teinte,
        quantity: selectedTeeth.length,
        unit_price: catalogItem.default_price,
        total: selectedTeeth.length * catalogItem.default_price
      }];

      const { data, error } = await supabase
        .from('delivery_notes')
        .insert({
          user_id: userId,
          dentist_id: dentist.id,
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          date: date,
          items: items,
          status: status,
          notes: i % 3 === 0 ? 'Urgent - À livrer rapidement' : null,
          prescription_date: date
        })
        .select()
        .single();

      if (error) throw error;
      deliveryNotes.push(data);
    }

    console.log('Generated delivery notes:', deliveryNotes.length);

    // 6. Générer 12 proformas
    const proformas = [];
    const proformaStatuses = ['pending', 'validated', 'invoiced'];

    for (let i = 0; i < 12; i++) {
      const dentist = getRandomElement(dentists);
      const date = getRandomDate(60);
      const status = i < 4 ? 'pending' : i < 8 ? 'validated' : 'invoiced';
      const itemsCount = Math.floor(Math.random() * 3) + 1;

      const subtotal = getRandomPrice(200, 1200);
      const taxRate = 20;
      const taxAmount = Math.round(subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      const { data: proformaData, error: proformaError } = await supabase
        .from('proformas')
        .insert({
          user_id: userId,
          dentist_id: dentist.id,
          date: date,
          status: status,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          notes: i % 4 === 0 ? 'Proforma avec remise spéciale' : null
        })
        .select()
        .single();

      if (proformaError) throw proformaError;

      // Ajouter des items au proforma
      for (let j = 0; j < itemsCount; j++) {
        const catalogItem = getRandomElement(catalogItems);
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = catalogItem.default_price;
        const itemTotal = quantity * unitPrice;

        await supabase
          .from('proforma_items')
          .insert({
            proforma_id: proformaData.id,
            description: catalogItem.name,
            quantity: quantity,
            unit_price: unitPrice,
            total: itemTotal
          });
      }

      proformas.push(proformaData);
    }

    console.log('Generated proformas:', proformas.length);

    // 7. Générer 8 factures
    const invoices = [];
    const invoiceStatuses = ['draft', 'sent', 'paid', 'partially_paid'];

    for (let i = 0; i < 8; i++) {
      const dentist = getRandomElement(dentists);
      const date = getRandomDate(45);
      const status = i < 2 ? 'draft' : i < 4 ? 'sent' : i < 6 ? 'paid' : 'partially_paid';

      const subtotal = getRandomPrice(300, 1500);
      const taxRate = 20;
      const taxAmount = Math.round(subtotal * taxRate) / 100;
      const total = subtotal + taxAmount;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          dentist_id: dentist.id,
          date: date,
          month: new Date(date).getMonth() + 1,
          year: new Date(date).getFullYear(),
          status: status,
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: total,
          payment_method: status === 'paid' || status === 'partially_paid' ? getRandomElement(['bank_transfer', 'check', 'cash']) : null
        })
        .select()
        .single();

      if (error) throw error;
      invoices.push(data);
    }

    console.log('Generated invoices:', invoices.length);

    // Marquer les données comme étant de démo
    await supabase
      .from('demo_data_markers')
      .insert({
        user_id: userId,
        data_type: 'complete_demo_set',
        created_at: new Date().toISOString()
      });

    console.log('Demo data generation completed successfully');

    return {
      success: true,
      data: {
        dentists,
        patients,
        catalogItems,
        resources,
        deliveryNotes,
        proformas,
        invoices
      }
    };
  } catch (error: any) {
    console.error('Error generating demo data:', error);
    return {
      success: false,
      error: error.message || 'Une erreur est survenue lors de la génération des données'
    };
  }
}

export async function cleanupDemoData(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Cleaning up demo data for user:', userId);

    // Supprimer dans l'ordre inverse des dépendances
    await supabase.from('invoice_payments').delete().eq('user_id', userId);
    await supabase.from('invoice_proformas').delete().eq('invoice_id', userId);
    await supabase.from('proforma_items').delete().match({ proforma_id: userId });
    await supabase.from('stock_movements').delete().eq('user_id', userId);
    await supabase.from('resource_variants').delete().match({ resource_id: userId });

    await supabase.from('invoices').delete().eq('user_id', userId);
    await supabase.from('proformas').delete().eq('user_id', userId);
    await supabase.from('delivery_notes').delete().eq('user_id', userId);
    await supabase.from('resources').delete().eq('user_id', userId);
    await supabase.from('catalog_items').delete().eq('user_id', userId);
    await supabase.from('patients').delete().eq('user_id', userId);
    await supabase.from('dentists').delete().eq('user_id', userId);
    await supabase.from('demo_data_markers').delete().eq('user_id', userId);

    console.log('Demo data cleanup completed');

    return { success: true };
  } catch (error: any) {
    console.error('Error cleaning up demo data:', error);
    return {
      success: false,
      error: error.message || 'Une erreur est survenue lors du nettoyage des données'
    };
  }
}
