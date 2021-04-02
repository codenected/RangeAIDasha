import "commonReactions/all.dsl";
context
{
    input phone: string;
    age: number = -1;
    output result:boolean=false;
    amount: string="";
    am_check: boolean=false;
}

/*
* Script.
*/
start node root
{
    do
    {
        #connectSafe($phone);
        wait *;
    }
    transitions
    {
        transition4: goto AM on true;
        transition5: goto AM on  #messageHasData("numberword") priority 5000;
        transition6: goto AM_check on #messageHasIntent("potential_no_am") priority 5000;
        transition7: goto greeting on #messageHasIntent("no_answering_machine") priority 10000;
    }
}
node AM_check
{
    do
    {
        #say("hello");
        wait *;
    }
    
    transitions
    {
        transition0: goto AM on true;
        transition15: goto AM on  #messageHasData("numberword") priority 5000;
        transition16: goto greeting on #messageHasIntent("no_answering_machine") priority 10000;
    }
}
node AM
{
    do
    {
        set $status="Answering_machine_custom";
        #disconnect();
        exit;
    }
    transitions
    {
    }
}
node greeting
{
    do
    {
        #say("greeting");
        wait *;
    }
    transitions
    {
        transition0: goto pitch on true;
        transition1: goto bye_common on #messageHasSentiment("negative") || #messageHasIntent("not_interested") || #messageHasIntent("not_interested_custom") priority 150;
    }
}
node pitch
{
    do
    {
        if (#messageHasIntent("how_do_you_do"))
        {
            #say("pitch");
        }
        else
        {
            #say("pitch_2");
        }
        wait *;
    }
    transitions
    {
        transition0: goto customer_consent on 45 < digression.parse_number.age && digression.parse_number.age < 79 || 45 == digression.parse_number.age || 79 == digression.parse_number.age;
        transition1: goto unsuitable_age on 45 > digression.parse_number.age ||  79 < digression.parse_number.age && digression.parse_number.age <= 120;
        transition2: goto bye_common on #messageHasIntent("not_interested") || #messageHasIntent("not_interested_custom") || #messageHasSentiment("negative") priority 150;
        transition3: goto invalid_age on 120 < digression.parse_number.age priority 150;
    }
}
node invalid_age
{
    do
    {
        #say("invalid_age");
        wait *;
    }
    transitions
    {
        transition0: goto customer_consent on 45 < digression.parse_number.age && digression.parse_number.age < 79 || 45 == digression.parse_number.age || 79 == digression.parse_number.age;
        transition1: goto unsuitable_age on 45 > digression.parse_number.age ||  79 < digression.parse_number.age;
        transition2: goto bye_common on #messageHasIntent("not_interested");
    }
}
digression invalid_age
{
    conditions
    {
        on 120 < digression.parse_number.age || 5 > digression.parse_number.age priority 150;
    }
    do
    {
        #say("invalid_age");
        return;
    }
}
node customer_consent
{
    do
    {
        #say("customer_consent");
        wait *;
    }
    transitions
    {
        transition0: goto bye_win on #messageHasSentiment("positive");
        transition1: goto bye_common on #messageHasSentiment("negative") || #messageHasIntent("not_interested") || #messageHasIntent("not_interested_custom");
    }
}
node bye_win
{
    do
    {
        set $status="qualified";
        #say("bye");
        #forward("19094629880");
        exit;
    }
    transitions
    {
    }
}
node bye_common
{
    do
    {
        set $status="disqualified";
        #say("bye_common");
        exit;
    }
    transitions
    {
    }
}
node unsuitable_age
{
    do
    {
        set $status="unsuitable_age";
        #say("bye_fail");
        exit;
    }
    transitions
    {
    }
}
digression hangup
{
    conditions
    {
        on true tags: onclosed;
    }
    do
    {
        set $status = "user_hang_up";
        exit;
    }
    transitions
    {
    }
}
preprocessor digression parse_number
{
    conditions
    {
        on true priority 100000; 
    }
    var age: number = -1;
    do
    {
        var x = #messageGetData("numberword",
        {
            value: true
        }
        )[0]?.value ?? "NaN";
        set digression.parse_number.age = #parseInt(x);
        return;
    }
}