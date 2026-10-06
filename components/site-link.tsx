import type {ComponentProps} from 'react';

// Use a normal browser navigation until the deployed framework's client-side
// Link runtime is reliable. The href remains crawlable and works without JS.
export default function SiteLink(props:ComponentProps<'a'>){
 return <a {...props}/>;
}
