export interface InventoryData {
  season: string;
  kgRemaining: number;
  boxesRemaining: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  active: boolean;
}

export async function getActiveInventory(): Promise<InventoryData | null> {
  try {
    const response = await fetch('/api/inventory', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Error fetching inventory');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return null;
  }
}
