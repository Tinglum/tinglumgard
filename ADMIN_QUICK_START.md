# Admin Quick Start Guide - Egg Integration

## 🚀 Quick Start

### 1. Access Admin Panel
Navigate to `/admin` and log in with your admin password.

### 2. Product Mode Toggle
At the top of the page, you'll see three buttons:
- **🐷 Pigs** - View only pig-related data
- **🥚 Eggs** - View only egg-related data
- **📊 Combined** - View everything

Click to switch between modes. All tabs will update to show filtered data.

---

## 🥚 Managing Eggs

### Setting Up Breeds

1. Click the **"Eggraser"** tab
2. Click **"Ny rase"** button
3. Fill in the form:
   - **Rasenavn**: E.g., "Ayam Cemani"
   - **Slug**: Auto-generated, but editable
   - **Pris per egg**: Enter price in øre (e.g., 12000 = 120 kr)
   - **Aksentfarge**: Choose a brand color
   - **Beskrivelse**: Add breed details
   - **Visningsrekkefølge**: Set display order (0 = first)
   - **Aktiv**: Check to make visible to customers
4. Click **"Legg til rase"**

**Tips:**
- Price is in øre (100 øre = 1 kr)
- Slug is the URL-friendly name
- Use accent color for breed identification
- Inactive breeds won't show to customers

### Managing Inventory

1. Click the **"Lager"** tab
2. Switch to **🥚 Eggs** mode (or use Combined)
3. You'll see all inventory weeks with:
   - Breed name and color badge
   - Week number and year
   - Delivery date
   - Allocation progress bar
   - Status badge
   - Remaining eggs count

**To add new inventory:**
1. Click **"Legg til uke"** (feature to be implemented)
2. Or use SQL:
```sql
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
VALUES ('breed-uuid', 2026, 20, '2026-05-11', 60, 0, 'open');
```

**To edit inventory:**
- Click **"Rediger"** on any week card
- Adjust available eggs or status
- Click **"Steng"/"Åpne"** to toggle availability

**Status meanings:**
- **Åpen** (open) - Available for orders
- **Stengt** (closed) - Hidden from customers
- **Utsolgt** (sold_out) - All eggs allocated
- **Låst** (locked) - Cannot be modified

### Viewing Egg Orders

1. Click the **"Bestillinger"** tab
2. Switch to **🥚 Eggs** mode
3. Orders will show:
   - 🥚 badge for egg orders
   - Breed name
   - Quantity
   - Week number
   - Delivery type

**Click any order** to see full details including:
- Breed information
- Egg quantity
- Delivery week and date
- Customer info
- Payment status
- Notes

### Analytics & Reports

1. Click the **"Analyse"** tab
2. Switch to **🥚 Eggs** mode
3. View:
   - Average eggs per order
   - Average order value
   - Weeks with sales
   - Sales per breed (with visual bars)
   - Weekly sales breakdown
   - Top 10 customers

---

## 📊 Combined Mode Benefits

When in **Combined** mode:
- Dashboard shows both pig AND egg metrics
- Orders list includes both product types
- Inventory shows both systems
- Analytics displays separate sections
- Get a complete business overview

---

## 🔧 Common Tasks

### Add 8 Weeks of Inventory for a Breed
```sql
INSERT INTO egg_inventory (breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status)
SELECT
  'your-breed-uuid',
  2026,
  week_num,
  ('2026-03-16'::date + ((week_num - 12) * 7 || ' days')::interval)::date,
  60,
  0,
  'open'
FROM generate_series(12, 19) AS week_num;
```

### Make a Breed Inactive (Hide from Customers)
1. Go to **Eggraser** tab
2. Find the breed
3. Click the eye icon to toggle active/inactive

### Change Egg Prices
1. Go to **Eggraser** tab
2. Click **"Rediger"** on the breed
3. Update **Pris per egg** (remember: in øre)
4. Click **"Lagre endringer"**

### View Only Pending Egg Orders
1. Go to **Bestillinger** tab
2. Switch to **🥚 Eggs** mode
3. Use the status filter: Select **"Forskudd betalt"**

---

## 🎯 Best Practices

### Inventory Management
- Add inventory 4-8 weeks in advance
- Set realistic egg quantities
- Close weeks when breeding schedules don't allow orders
- Monitor allocation progress bars

### Breed Management
- Keep breed descriptions accurate and compelling
- Use distinct accent colors for easy identification
- Set display_order to control front-end sort order
- Only show breeds you can reliably supply

### Order Processing
1. Customer places order → Status: "draft"
2. Deposit paid → Status: "deposit_paid"
3. Remainder paid → Status: "paid"
4. Eggs ready → Status: "ready_for_pickup"
5. Customer received → Status: "completed"

### Analytics Review
- Check weekly to see sales trends
- Identify top-selling breeds
- Monitor average order sizes
- Track repeat customers

---

## 🚨 Safety Features

### Breed Deletion
- **Cannot delete** breeds with existing orders
- **Cannot delete** breeds with inventory
- Must set to inactive instead

### Inventory Deletion
- **Cannot delete** inventory with orders
- Protects against data loss

### Order Locking
- Locked orders cannot be modified
- Prevents accidental changes to completed orders

---

## 📱 Tab Overview

| Tab | Egg Features |
|-----|-------------|
| Dashboard | Egg metrics (orders, revenue, eggs sold, top breed) |
| Bestillinger | Egg orders with breed/quantity/week info |
| Kunder | All customers (shared) |
| Analyse | Egg analytics (breeds, weeks, customers) |
| Kommunikasjon | Email system (shared) |
| Kundemeldinger | Customer support (shared) |
| Hentekalender | Pig-only (no egg equivalent yet) |
| Lager | Egg inventory by week |
| **Eggraser** | **NEW: Breed management** |
| Boksinnhold | Pig-only |
| Rabattkoder | Shared |
| Ekstraprodukter | Pig-only |
| Varsler | Shared |
| Systemhelse | Shared |
| Innstillinger | Shared |

---

## 🔍 Troubleshooting

### "No data available"
- Check if you've added breeds (Eggraser tab)
- Check if you've added inventory (Lager tab)
- Verify database connection

### "Cannot delete breed"
- Breed has orders or inventory
- Set to inactive instead using eye icon

### Orders not showing
- Verify product mode (switch to Eggs or Combined)
- Check status filter
- Refresh the page

### Inventory not updating
- Click the refresh button
- Check browser console for errors
- Verify API endpoints are accessible

---

## 💡 Tips for Success

1. **Start with breeds** - Set up your catalog first
2. **Add inventory** - Populate 4-8 weeks ahead
3. **Test ordering** - Place a test order to see the flow
4. **Monitor daily** - Check for new orders each morning
5. **Update inventory** - Keep egg availability current
6. **Use Combined mode** - Get full business visibility
7. **Review analytics** - Weekly review of sales trends

---

## 📞 Need Help?

- Check `IMPLEMENTATION_COMPLETE.md` for technical details
- Check `ADMIN_INTEGRATION_PLAN.md` for the full implementation plan
- Review the database schema in `EGG_INTEGRATION_MIGRATION.sql`

---

**Ready to go live with eggs!** 🥚🎉
