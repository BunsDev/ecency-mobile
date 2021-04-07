
export interface TabbedPostsProps {
    filterOptions:string[],
    filterOptionsValue:string[],
    isFeedScreen:boolean,
    feedUsername:string,
    initialFilterIndex:number,
    feedSubfilterOptions:string[],
    feedSubfilterOptionsValue:string[],
    getFor:string,
    pageType:string,
    tag:string,
}

export interface TabMeta {
    startPermlink:string,
    startAuthor:string,
    isLoading:boolean,
    isRefreshing:boolean,
    isNoPost:boolean,
  }
  
  export interface LoadPostsOptions {
        
    filterKey:string;
    prevPosts:any[];
      tabMeta:TabMeta;
      setTabMeta:(meta:TabMeta)=>void,
      getFor:string,
      isConnected:boolean,
      isLoggedIn:boolean,
      feedUsername:string,
      pageType:string,
      tag:string,
      nsfw:string,
      isAnalytics:boolean,
      isLatestPostCheck?:boolean,
      refreshing?:boolean,

  }