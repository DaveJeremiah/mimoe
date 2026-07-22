import { supabase } from "@/integrations/supabase/client";

export async function generateIllustration(phrase: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-image", {
    body: { phrase },
  });

  if (error) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }

  if (!data?.imageUrl) {
    throw new Error("No image URL returned from the server");
  }

  return data.imageUrl;
}
