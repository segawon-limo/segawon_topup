import { Link } from "react-router-dom";

export default function GameCard({ game }) {
  return (
    <Link
      to={`/order/${game.slug}`}
      className="
        group
        bg-white
        rounded-xl
        overflow-hidden
        shadow
        hover:shadow-lg
        transition
      "
    >
      {/* Image 1:1 */}
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={game.icon_url}
          alt={game.name}
          loading="lazy"
          className="
            w-full h-full object-cover
            transition-transform duration-300 ease-out
            group-hover:scale-125
          "
          onError={(e) => {
            e.currentTarget.src =
              "/images/games_icon/placeholder.webp";
          }}
        />
      </div>

      {/* Name area */}
      <div
        className="
          py-4 px-2
          text-center
          bg-white
          transition-colors duration-300
          group-hover:bg-red-500
        "
      >
        <h3
          className="
            text-sm font-semibold
            text-gray-800
            transition-colors duration-300
            group-hover:text-white
          "
        >
          {game.name}
        </h3>
      </div>
    </Link>
  );
}
