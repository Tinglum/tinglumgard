# Unread Message Notification Feature

## Overview
The "Min side" navigation link now displays a red notification badge showing the count of unread messages when a client has new admin replies.

## How It Works

### 1. Database Tracking
- Added `last_viewed_at` column to `customer_messages` table
- This timestamp tracks when the customer last viewed each message thread
- Migration: `20260201_add_message_read_tracking.sql`

### 2. Unread Count Logic
New API endpoint: `/api/messages/unread-count`

**GET request:**
- Returns `{ unreadCount: number }`
- A message is "unread" if:
  - It has admin replies (non-internal)
  - AND the customer has never viewed it (`last_viewed_at` is null)
  - OR there are replies created after `last_viewed_at`

**POST request:**
- Marks messages as viewed by updating `last_viewed_at` to current time
- Accepts `{ messageIds: string[] }`
- Only updates messages belonging to the authenticated customer

### 3. Header Component Updates
**File:** `components/Header.tsx`

- Fetches unread count on mount when user is authenticated
- Auto-refreshes every 30 seconds to check for new messages
- Displays red badge with count on:
  - Desktop "Min side" nav link
  - Mobile dropdown "Min side" link
- Badge shows when `unreadCount > 0`

### 4. Auto-Mark as Read
**File:** `components/MessagingPanel.tsx`

- When customer opens the messages tab, all messages are automatically marked as viewed
- This resets the unread count for the next admin replies

## UI Design

### Badge Appearance
```tsx
<span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
  {unreadMessageCount}
</span>
```

- Position: Top-right corner of "Min side" link
- Color: Red (`bg-red-500`)
- Size: 20px × 20px circle
- Border: 2px white border for contrast
- Font: Bold, 10px

## User Flow

1. **Admin sends reply** to customer message
2. **Customer visits site** (authenticated)
3. **Header fetches unread count** → Shows red "1" badge on "Min side"
4. **Customer clicks "Min side"** → Opens messages tab
5. **MessagingPanel loads** → Marks all messages as viewed
6. **Badge disappears** (count becomes 0)
7. **Next admin reply** → Badge appears again

## Performance Considerations

- **Polling interval:** 30 seconds (configurable in Header.tsx)
- **Efficient query:** Uses indexed `last_viewed_at` field
- **Lightweight:** Only counts, doesn't fetch full message content
- **Security:** Only queries customer's own messages via session phone number

## Database Migration

Run this migration on your Supabase instance:

```sql
-- File: supabase/migrations/20260201_add_message_read_tracking.sql
ALTER TABLE customer_messages
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customer_messages_last_viewed 
ON customer_messages(last_viewed_at);
```

## Testing Checklist

- [ ] Badge appears when admin sends reply
- [ ] Badge shows correct count (1, 2, 3, etc.)
- [ ] Badge disappears after opening messages tab
- [ ] Badge reappears after new admin reply
- [ ] Works on both desktop and mobile views
- [ ] Polling updates badge without page refresh
- [ ] Badge only shows for authenticated users
- [ ] Badge only shows customer's own unread count

## Future Enhancements

Consider these potential improvements:

1. **Real-time updates** - Use Supabase Realtime instead of 30s polling
2. **Push notifications** - Browser notifications for new messages
3. **Email notifications** - Send email when admin replies
4. **Read receipts** - Show admin when customer has read reply
5. **Per-message read status** - Track which specific messages are unread
