<script lang="ts">
  export let tags: string[] = [];
</script>

<div class="flex flex-wrap gap-2">
  {#each tags as tag}
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {tag}
    </span>
  {/each}
</div>