import { PostCard } from "./PostCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

export function HomePage() {
  const posts = [
    {
      author: {
        name: "Emily Rivers",
        username: "emilyrivers",
        avatar: "https://images.unsplash.com/photo-1624537046903-1e4acee0487f?w=100&h=100&fit=crop",
      },
      title: "Whispers of Autumn",
      content: `Golden leaves dance in the breeze,
A symphony of amber and rust,
Time whispers through the trees,
In nature's gentle, fading trust.`,
      likes: 342,
      comments: 28,
      timestamp: "2h ago",
      category: "Nature",
    },
    {
      author: {
        name: "Marcus Vale",
        username: "marcusvale",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      },
      title: "Urban Solitude",
      content: `Between concrete towers I walk alone,
City lights paint shadows on my face,
In this maze of glass and stone,
I search for a familiar place.

The crowd moves like a rushing stream,
Yet I stand still, an island here,
Lost in some forgotten dream,
Where silence is all I hear.`,
      likes: 567,
      comments: 43,
      timestamp: "4h ago",
      category: "Urban Life",
    },
    {
      author: {
        name: "Sarah Chen",
        username: "sarahwrites",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      },
      title: "First Love",
      content: `Your smile, a sunrise in my darkest night,
Your touch, a melody I've never known,
In your eyes, I found my guiding light,
With you, I've never felt alone.`,
      likes: 892,
      comments: 67,
      timestamp: "6h ago",
      category: "Love",
    },
    {
      author: {
        name: "James Winters",
        username: "jwinters",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      },
      content: `stars fall
like broken promises
into the night`,
      likes: 234,
      comments: 19,
      timestamp: "8h ago",
      category: "Haiku",
    },
    {
      author: {
        name: "Luna Martinez",
        username: "lunapoet",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
      },
      title: "The Writer's Desk",
      content: `Ink bleeds across the page tonight,
Words tumble from my weary soul,
Each letter holds a piece of light,
Each verse attempts to make me whole.

The blank page stares, demanding more,
My pen, a sword against the void,
I wage this war like those before,
To craft the truth I've long avoided.`,
      likes: 445,
      comments: 35,
      timestamp: "10h ago",
      category: "Writing",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 md:space-y-6">
        {posts.map((post, index) => (
          <PostCard key={index} {...post} />
        ))}
      </div>
    </div>
  );
}