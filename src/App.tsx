import { createSignal, createEffect, For, onMount } from 'solid-js'
import { marked } from 'marked'

// Import markdown files as raw text
const restaurantModules = import.meta.glob('./restaurants/*.md', { 
  query: '?raw',
  import: 'default',
  eager: true 
}) as Record<string, string>

interface Restaurant {
  id: string
  title: string
  content: string
  html: string
}

// Parse restaurants from markdown files
function parseRestaurants(): Restaurant[] {
  return Object.entries(restaurantModules).map(([path, content]) => {
    const id = path.replace('./restaurants/', '').replace('.md', '')
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : id
    return {
      id,
      title,
      content,
      html: marked.parse(content) as string
    }
  })
}

const THEME_KEY = 'yuki-tour-planner-theme'

type Theme = 'light' | 'dark'

// URL state helpers
function getIdsFromUrl(): string[] {
  const params = new URLSearchParams(window.location.search)
  const tour = params.get('tour')
  if (!tour) return []
  return tour.split(',').filter(id => id.length > 0)
}

function setIdsInUrl(ids: string[]) {
  const url = new URL(window.location.href)
  if (ids.length === 0) {
    url.searchParams.delete('tour')
  } else {
    url.searchParams.set('tour', ids.join(','))
  }
  window.history.replaceState({}, '', url.toString())
}

function App() {
  const allRestaurants = parseRestaurants()
  const [selectedList, setSelectedList] = createSignal<Restaurant[]>([])
  const [theme, setTheme] = createSignal<Theme>('dark')

  // Load from URL on mount
  onMount(() => {
    // Load list from URL
    const ids = getIdsFromUrl()
    if (ids.length > 0) {
      const restored = ids
        .map(id => allRestaurants.find(r => r.id === id))
        .filter((r): r is Restaurant => r !== undefined)
      setSelectedList(restored)
    }

    // Load saved theme from localStorage (theme is personal preference, not shared)
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  })

  // Save list to URL whenever it changes
  createEffect(() => {
    const ids = selectedList().map(r => r.id)
    setIdsInUrl(ids)
  })

  // Apply theme to document and save to localStorage
  createEffect(() => {
    const currentTheme = theme()
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem(THEME_KEY, currentTheme)
  })

  const toggleTheme = () => {
    setTheme(theme() === 'dark' ? 'light' : 'dark')
  }

  const availableRestaurants = () => {
    const selectedIds = new Set(selectedList().map(r => r.id))
    return allRestaurants.filter(r => !selectedIds.has(r.id))
  }

  const addRestaurant = (id: string) => {
    const restaurant = allRestaurants.find(r => r.id === id)
    if (restaurant) {
      setSelectedList([...selectedList(), restaurant])
    }
  }

  const removeRestaurant = (id: string) => {
    setSelectedList(selectedList().filter(r => r.id !== id))
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    const newList = [...selectedList()]
    const [removed] = newList.splice(index, 1)
    newList.splice(index - 1, 0, removed)
    setSelectedList(newList)
  }

  const moveDown = (index: number) => {
    const list = selectedList()
    if (index >= list.length - 1) return
    const newList = [...list]
    const [removed] = newList.splice(index, 1)
    newList.splice(index + 1, 0, removed)
    setSelectedList(newList)
  }

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Yuki Tour Planner',
        text: `Check out my restaurant tour with ${selectedList().length} stops!`,
        url: window.location.href
      })
    } else {
      // Fallback to clipboard if share API not available
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div class="w-full max-w-[700px] p-8 max-sm:p-4">
      <header class="flex justify-between items-start mb-8 max-sm:mb-4">
        <div>
          <h1 class="m-0 mb-1 text-[2rem] max-sm:text-2xl">Yuki Tour Planner</h1>
          <p class="text-text-secondary m-0">Plan your restaurant tour in Japan</p>
        </div>
        <div class="flex gap-2">
          {selectedList().length > 0 && (
            <button 
              type="button" 
              class="bg-bg-tertiary border border-border text-text-primary rounded-lg px-3 py-2 text-base font-medium cursor-pointer transition-colors duration-200 hover:border-accent"
              onClick={shareLink}
              aria-label="Copy share link"
            >
              Share
            </button>
          )}
          <button 
            type="button" 
            class="bg-bg-tertiary border border-border text-text-primary rounded-lg px-3 py-2 text-xl cursor-pointer transition-colors duration-200 hover:border-accent"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme() === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </header>

      <div class="mb-8 max-sm:mb-4">
        <label for="restaurant-select" class="block mb-2 font-medium">Add a restaurant:</label>
        <select 
          id="restaurant-select"
          class="w-full p-3 text-base rounded-lg border border-border bg-bg-primary text-text-primary cursor-pointer hover:border-accent"
          onChange={(e) => {
            const value = e.currentTarget.value
            if (value) {
              addRestaurant(value)
              e.currentTarget.value = ''
            }
          }}
        >
          <option value="">Select a restaurant...</option>
          <For each={availableRestaurants()}>
            {(restaurant) => (
              <option value={restaurant.id}>{restaurant.title}</option>
            )}
          </For>
        </select>
      </div>

      <div>
        <h2 class="mb-4">Your Tour ({selectedList().length} stops)</h2>
        
        {selectedList().length === 0 ? (
          <p class="text-text-secondary italic">No restaurants added yet. Select one from the dropdown above.</p>
        ) : (
          <ul class="list-none p-0 m-0">
            <For each={selectedList()}>
              {(restaurant, index) => (
                <li class="bg-bg-tertiary border border-border rounded-lg mb-3 max-sm:mb-2 transition-[transform,box-shadow] duration-150 ease-in-out hover:border-accent">
                  <div class="flex items-center px-4 py-3 gap-3 max-sm:px-3 max-sm:py-2 max-sm:gap-2">
                    <span class="font-semibold text-accent min-w-6">{index() + 1}.</span>
                    <span class="flex-1 text-base font-medium max-sm:text-sm">{restaurant.title}</span>
                    <div class="flex items-center gap-2">
                      <div class="flex flex-row gap-1">
                        <button
                          type="button"
                          class="bg-bg-secondary border border-border rounded px-2.5 py-1 text-[0.8rem] cursor-pointer text-text-primary leading-none transition-[border-color,opacity] duration-200 hover:not-disabled:border-accent hover:not-disabled:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed max-sm:px-3 max-sm:py-1.5"
                          onClick={() => moveUp(index())}
                          disabled={index() === 0}
                          aria-label={`Move ${restaurant.title} up`}
                        >
                          &#9650;
                        </button>
                        <button
                          type="button"
                          class="bg-bg-secondary border border-border rounded px-2.5 py-1 text-[0.8rem] cursor-pointer text-text-primary leading-none transition-[border-color,opacity] duration-200 hover:not-disabled:border-accent hover:not-disabled:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed max-sm:px-3 max-sm:py-1.5"
                          onClick={() => moveDown(index())}
                          disabled={index() === selectedList().length - 1}
                          aria-label={`Move ${restaurant.title} down`}
                        >
                          &#9660;
                        </button>
                      </div>
                      <button
                        type="button"
                        class="bg-transparent border-none text-danger text-2xl max-sm:text-xl cursor-pointer px-2 max-sm:px-1 leading-none opacity-70 transition-opacity duration-150 hover:opacity-100"
                        onClick={() => removeRestaurant(restaurant.id)}
                        aria-label={`Remove ${restaurant.title}`}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <div 
                    class="restaurant-content px-4 pb-3 max-sm:px-3 max-sm:pb-2 border-t border-border"
                    innerHTML={restaurant.html}
                  />
                </li>
              )}
            </For>
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
