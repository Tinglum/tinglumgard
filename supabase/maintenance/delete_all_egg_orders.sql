-- Delete all egg orders and release inventory allocations.
-- Run this in the Supabase SQL editor.

begin;

-- Remove dependent rows first.
delete from egg_order_additions;
delete from egg_payments;

-- Remove all egg orders.
delete from egg_orders;

-- Release all egg allocations and reopen inventory when possible.
update egg_inventory
set eggs_allocated = 0,
    status = case
      when eggs_available > 0 then 'open'
      else 'sold_out'
    end;

commit;
