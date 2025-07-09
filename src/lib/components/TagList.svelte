<script lang="ts">
  export let tags: string[] = [];
  export let searchQuery: string = '';

  function highlightSearchTerms(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100">$1</mark>');
    });
    
    return highlightedText;
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each tags.sort() as tag}
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
      {@html highlightSearchTerms(tag, searchQuery)}
    </span>
  {/each}
</div>