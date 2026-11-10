import { Button } from "@/shared/components/ui/button";
import { Text } from "@/shared/components/ui/text";
import { View } from "react-native";

export default function LandingPage() {
  return (
    <View>
      <Button variant="default">
        <Text className="text-icon">A BUTTON</Text>
      </Button>
      <Button variant="outline">
        <Text className="text-icon" >A BUTTON</Text>
      </Button>
    </View>
  );
}
