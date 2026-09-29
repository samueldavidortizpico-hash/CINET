import { useState } from "react";

/** Misma URL reactiva y respaldo en Profile y Navbar. */
export default function UserAvatar({ user, className = "profile-avatar" }) {
  const [brokenUrl, setBrokenUrl] = useState(null);
  return (
    <span className={className} aria-hidden="true">
      {user.avatarUrl && user.avatarUrl !== brokenUrl
        ? <img src={user.avatarUrl} alt="" onError={() => setBrokenUrl(user.avatarUrl)} />
        : user.name.charAt(0).toUpperCase()}
    </span>
  );
}
