export async function updateInventory(season: string, kgRemaining: number) {
  try {
    const response = await fetch('/api/admin/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season, kgRemaining }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error updating inventory:', error);
    return { success: false, error: 'Failed to update inventory' };
  }
}

export async function getAllOrders() {
  try {
    const response = await fetch('/api/admin/orders', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}
