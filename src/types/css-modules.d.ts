declare module 'swiper/css' { const content: string; export default content }
declare module 'swiper/css/navigation' { const content: string; export default content }
declare module 'swiper/css/pagination' { const content: string; export default content }
declare module 'splitting/dist/splitting.css' { const content: string; export default content }
declare module 'splitting' {
  interface SplittingOptions {
    target?: Element
    by?: string
  }
  interface SplittingResult {
    chars?: HTMLElement[]
    words?: HTMLElement[]
  }
  function Splitting(options?: SplittingOptions): SplittingResult[]
  export default Splitting
}
