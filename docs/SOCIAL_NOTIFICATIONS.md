# Social notifications (v2)

## Scope

In-app social notifications live under **`GET /social/notifications`** and the **`/notifications`** page. They cover community activity only.

## Included

- New followers
- Comments on your posts
- Thanks (post appreciations) on your posts
- New posts in groups you have joined (excluding your own posts)

Unread counts use **`social_activity_reads.lastReadAt`**. Visiting **`/notifications`** marks social notifications read via **`PATCH /social/notifications/read`**, which clears the nav badge (`AppNav` listens for `epicsexual:notifications-changed`).

## Excluded

- **Direct message unread counts** remain on **`/messages`** only. They are not duplicated in social notifications.

## Deep links

- Member posts: `/feed#post-{postId}`
- Group posts: `/community/groups/{slug}?post={postId}`
