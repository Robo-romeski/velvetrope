# PostHog: epicsexual production view

Shared PostHog project **694818** receives events from multiple apps. Use this
filtered Activity view for **production epicsexual.com** traffic only.

## Saved filters

| Filter | Value |
|--------|--------|
| Date range | Last 7 days |
| `app` | equals `epicsexual` |
| `$current_url` | contains `epicsexual.com` |

## Open the view (bookmark this URL)

https://us.posthog.com/project/694818/activity/events#q=%7B%22kind%22%3A%22DataTableNode%22%2C%22full%22%3Atrue%2C%22source%22%3A%7B%22kind%22%3A%22EventsQuery%22%2C%22select%22%3A%5B%22*%22%2C%22event%22%2C%22person_display_name%20--%20Person%22%2C%22coalesce(properties.%24current_url%2C%20properties.%24screen_name)%20--%20Url%20%2F%20Screen%22%2C%22properties.%24lib%22%2C%22timestamp%22%5D%2C%22orderBy%22%3A%5B%22timestamp%20DESC%22%5D%2C%22after%22%3A%22-7d%22%2C%22filterTestAccounts%22%3Afalse%2C%22properties%22%3A%5B%7B%22key%22%3A%22app%22%2C%22value%22%3A%5B%22epicsexual%22%5D%2C%22operator%22%3A%22exact%22%2C%22type%22%3A%22event%22%7D%2C%7B%22key%22%3A%22%24current_url%22%2C%22value%22%3A%22epicsexual.com%22%2C%22operator%22%3A%22icontains%22%2C%22type%22%3A%22event%22%7D%5D%7D%2C%22propertiesViaUrl%22%3Atrue%2C%22showSavedQueries%22%3Atrue%2C%22showPersistentColumnConfigurator%22%3Atrue%2C%22showPropertyFilter%22%3Atrue%7D

## Pin as a named view in PostHog UI

1. Open the URL above (Activity → Events).
2. Confirm chips: **app = epicsexual** and **Current URL ∋ epicsexual.com**.
3. Click **Custom query** (view selector, top right of the table).
4. Choose **Save as new view** (or rename the custom query) → name it
   **epicsexual production**.
5. Optional: star **Activity** in the sidebar for quick access.

Events before the `app` label shipped may appear when filtering by URL only;
use **app = epicsexual** to exclude other sites in the same project.
